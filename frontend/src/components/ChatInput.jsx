import { useRef } from 'react';

export default function ChatInput({ onSubmit }) {
  const inputRef = useRef();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputRef.current.value.trim()) {
      onSubmit(inputRef.current.value);
      inputRef.current.value = '';
    }
  };

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <input 
        ref={inputRef}
        placeholder="Ask about symptoms, treatments..." 
        aria-label="Medical question input"
      />
      <button type="submit">Send</button>
    </form>
  );
}