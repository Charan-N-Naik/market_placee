"""
prepare_dataset.py - Tier 2 Pest/Disease Dataset Preparation Script

Reads raw images from data/raw/{plantvillage,plantdoc}/,
applies a configurable 80/10/10 train/val/test split,
resizes all images to a standard resolution (224x224 by default),
and writes class-organised images into data/processed/{train,val,test}/.

Usage:
    python prepare_dataset.py
    python prepare_dataset.py --size 256 --val 0.15 --test 0.05
    python prepare_dataset.py --dry-run           (preview only, no file writes)

Outputs:
    data/processed/train/<class_name>/img.jpg
    data/processed/val/<class_name>/img.jpg
    data/processed/test/<class_name>/img.jpg
    data/split_manifest.json   (full record of every file placement)

Notes:
  - Supports both PlantVillage folder structure (class-labelled subdirs) and
    PlantDoc flat structure (we auto-map directory names to class_labels.json).
  - No images are ever modified in data/raw/ -- this script only reads from raw.
  - Reproducible: uses a fixed random seed (42) for consistent splits.
"""

import os
import sys
import json
import shutil
import random
import hashlib
import argparse
from pathlib import Path
from datetime import datetime

# PATH CONFIG
BASE_DIR            = Path(__file__).parent.resolve()
DATA_DIR            = BASE_DIR / "data"
RAW_PLANTVILLAGE    = DATA_DIR / "raw" / "plantvillage" / "plantvillage dataset" / "color"
RAW_PLANTDOC        = DATA_DIR / "raw" / "plantdoc"
PROCESSED_DIR       = DATA_DIR / "processed"
CLASS_LABELS_FILE   = DATA_DIR / "class_labels.json"
MANIFEST_FILE       = DATA_DIR / "split_manifest.json"

VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".webp"}

def load_class_labels():
    """Load class_labels.json and build a reverse lookup: directory_name -> class_id."""
    if not CLASS_LABELS_FILE.exists():
        print(f"[WARN] class_labels.json not found at {CLASS_LABELS_FILE}. Directory names will be used as class names directly.")
        return {}
    with CLASS_LABELS_FILE.open("r", encoding="utf-8") as f:
        data = json.load(f)
    class_mapping = data.get("class_mapping", {})
    reverse = {}
    for class_id, meta in class_mapping.items():
        crop    = meta.get("crop", "").lower().replace(" ", "_")
        disease = meta.get("disease", "").lower().replace(" ", "_")
        key     = f"{crop}_{disease}"
        reverse[key] = int(class_id)
        reverse[crop] = int(class_id)
    return reverse

def match_class_id(dir_name, reverse_lookup):
    """Try to match a raw directory name to a class ID from the label mapping."""
    normalized = dir_name.lower().replace("___", "_").replace(" ", "_").replace("-", "_")
    if normalized in reverse_lookup:
        return str(reverse_lookup[normalized])
    for key in reverse_lookup:
        if key in normalized or normalized in key:
            return str(reverse_lookup[key])
    return normalized

def collect_images(raw_root, reverse_lookup, source_tag):
    """Walk a raw source directory and return { class_name: [list of Path objects] }."""
    class_images = {}
    if not raw_root.exists():
        print(f"[SKIP] Directory not found: {raw_root}  (download data first)")
        return class_images
    subdirs = sorted([d for d in raw_root.iterdir() if d.is_dir()])
    if not subdirs:
        images = [f for f in raw_root.rglob("*") if f.suffix.lower() in VALID_EXTENSIONS]
        if images:
            label = source_tag.lower()
            class_images[label] = images
            print(f"  [{source_tag}] Flat dir -- {len(images)} images -> class '{label}'")
        return class_images
    total_images = 0
    for subdir in subdirs:
        class_name = match_class_id(subdir.name, reverse_lookup)
        images = [f for f in subdir.rglob("*") if f.suffix.lower() in VALID_EXTENSIONS]
        if images:
            if class_name not in class_images:
                class_images[class_name] = []
            class_images[class_name].extend(images)
            total_images += len(images)
    print(f"  [{source_tag}] Found {len(class_images)} classes, {total_images} total images")
    return class_images

def split_files(file_list, val_ratio, test_ratio):
    """Shuffle and split files into train / val / test lists."""
    random.shuffle(file_list)
    n        = len(file_list)
    n_test   = max(1, round(n * test_ratio)) if n >= 3 else 0
    n_val    = max(1, round(n * val_ratio))  if n >= 2 else 0
    n_train  = n - n_val - n_test
    return file_list[:n_train], file_list[n_train:n_train + n_val], file_list[n_train + n_val:]

def resize_and_copy(src, dst, target_size, dry_run):
    """Copy src -> dst, optionally resizing with Pillow. Falls back to plain copy."""
    if dry_run:
        return True
    dst.parent.mkdir(parents=True, exist_ok=True)
    try:
        from PIL import Image
        img = Image.open(src).convert("RGB")
        img = img.resize((target_size, target_size), Image.LANCZOS)
        save_path = dst.with_suffix(".jpg")
        img.save(save_path, "JPEG", quality=92)
        return True
    except ImportError:
        try:
            shutil.copy2(src, dst)
            return True
        except Exception as e:
            print(f"      [ERROR] Could not copy {src}: {e}")
            return False
    except Exception as e:
        print(f"      [ERROR] Could not process {src}: {e}")
        return False

def stable_filename(src, index):
    """Generate a unique, stable filename from source path + index."""
    h = hashlib.md5(str(src).encode()).hexdigest()[:8]
    return f"{index:06d}_{h}{src.suffix.lower()}"

def main(target_size=224, val_ratio=0.10, test_ratio=0.10, dry_run=False):
    random.seed(42)
    print("=" * 65)
    print("  KisanMitra -- Tier 2 Dataset Preparation Script")
    print("=" * 65)
    print(f"  Target image size   : {target_size}x{target_size}")
    train_ratio = 1 - val_ratio - test_ratio
    print(f"  Split ratios        : train={train_ratio:.0%}  val={val_ratio:.0%}  test={test_ratio:.0%}")
    print(f"  Dry run (no writes) : {dry_run}")
    print("-" * 65)
    try:
        from PIL import Image
        print("  Pillow              : detected -- images will be resized")
    except ImportError:
        print("  Pillow              : NOT found -- files will be copied as-is")
        print("  Install with: pip install Pillow")
    print("-" * 65)

    reverse_lookup = load_class_labels()

    print("\n[1/3] Scanning raw datasets...")
    pv_classes = collect_images(RAW_PLANTVILLAGE, reverse_lookup, "PlantVillage")
    pd_classes = collect_images(RAW_PLANTDOC,     reverse_lookup, "PlantDoc")

    merged = {}
    for cls, imgs in {**pv_classes, **pd_classes}.items():
        merged.setdefault(cls, []).extend(imgs)

    total_images = sum(len(v) for v in merged.values())
    print(f"\n  Total unique classes : {len(merged)}")
    print(f"  Total images found   : {total_images}")

    if total_images == 0:
        print("\n[!] No images found in raw directories. Please download the datasets first:\n")
        print("  PlantVillage:")
        print("    kaggle datasets download -d abdallahalidev/plantvillage-dataset -p data/raw/plantvillage --unzip")
        print("  PlantDoc:")
        print("    git clone https://github.com/pratikkayal/PlantDoc-Dataset.git data/raw/plantdoc\n")
        sys.exit(0)

    print("\n[2/3] Splitting and organising images...")
    manifest = {
        "created_at"  : datetime.now().isoformat(),
        "target_size" : target_size,
        "val_ratio"   : val_ratio,
        "test_ratio"  : test_ratio,
        "splits"      : {"train": {}, "val": {}, "test": {}},
        "summary"     : {}
    }
    splits_count = {"train": 0, "val": 0, "test": 0}
    global_index = 0

    for class_name, files in sorted(merged.items()):
        train_files, val_files, test_files = split_files(files, val_ratio, test_ratio)
        for split_name, split_files_list in [("train", train_files), ("val", val_files), ("test", test_files)]:
            manifest["splits"][split_name][class_name] = []
            dest_class_dir = PROCESSED_DIR / split_name / class_name
            for src_path in split_files_list:
                fname    = stable_filename(src_path, global_index)
                dst_path = dest_class_dir / fname
                success  = resize_and_copy(src_path, dst_path, target_size, dry_run)
                if success:
                    manifest["splits"][split_name][class_name].append(str(dst_path))
                    splits_count[split_name] += 1
                global_index += 1
        print(f"  {class_name:40s}  train={len(train_files):4d}  val={len(val_files):4d}  test={len(test_files):4d}")

    manifest["summary"] = {
        "total_images" : total_images,
        "train_images" : splits_count["train"],
        "val_images"   : splits_count["val"],
        "test_images"  : splits_count["test"],
        "num_classes"  : len(merged),
        "dry_run"      : dry_run,
    }

    print("\n[3/3] Writing split manifest...")
    if not dry_run:
        MANIFEST_FILE.parent.mkdir(parents=True, exist_ok=True)
        with MANIFEST_FILE.open("w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        print(f"  Manifest saved to : {MANIFEST_FILE}")
    else:
        print("  [DRY RUN] Manifest not written.")

    print("\n" + "=" * 65)
    print("  DATASET PREPARATION COMPLETE")
    print("=" * 65)
    print(f"  Classes processed : {len(merged)}")
    print(f"  Train images      : {splits_count['train']}")
    print(f"  Val   images      : {splits_count['val']}")
    print(f"  Test  images      : {splits_count['test']}")
    print(f"  Total placed      : {sum(splits_count.values())}")
    print("=" * 65)
    print("\nNext step: python train_model.py --epochs 10 --model mobilenet_v3\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Prepare PlantVillage / PlantDoc image dataset for Tier 2 training.")
    parser.add_argument("--size",    type=int,   default=224,  help="Target image size in pixels (default: 224)")
    parser.add_argument("--val",     type=float, default=0.10, help="Validation split ratio (default: 0.10)")
    parser.add_argument("--test",    type=float, default=0.10, help="Test split ratio (default: 0.10)")
    parser.add_argument("--dry-run", action="store_true",      help="Preview without writing files")
    args = parser.parse_args()
    if args.val + args.test >= 1.0:
        print("[ERROR] val + test ratios must sum to less than 1.0")
        sys.exit(1)
    main(target_size=args.size, val_ratio=args.val, test_ratio=args.test, dry_run=args.dry_run)
