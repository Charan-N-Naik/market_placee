import mongoose from 'mongoose';

async function test() {
  await mongoose.connect('mongodb://localhost:27017/kisanbazaar');
  const Schema = mongoose.Schema;
  
  const testSchema = new Schema({
    savedBy: [{ type: Schema.Types.ObjectId }]
  });
  
  const TestModel = mongoose.model('Test', testSchema);
  
  // Create a document
  const doc = new TestModel();
  // Push a string ID
  const stringId = new mongoose.Types.ObjectId().toString();
  doc.savedBy.push(stringId);
  await doc.save();
  
  console.log("Saved document with string pushed. savedBy array:", doc.savedBy);
  
  // Try to find it
  const found = await TestModel.find({ savedBy: stringId });
  console.log("Found using string in query:", found.length > 0);
  
  await mongoose.disconnect();
}

test().catch(console.error);
