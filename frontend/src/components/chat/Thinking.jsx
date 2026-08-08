export default function Thinking() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-100 rounded-2xl w-fit animate-pulse">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
    </div>
  );
}
