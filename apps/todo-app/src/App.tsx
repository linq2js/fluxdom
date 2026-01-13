import { useEffect, useState } from "react";
import { todoModel } from "./domain";
import { useSelector } from "fluxdom/react";
import "./App.css";

// SVG Icons
const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
  </svg>
);

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
      clipRule="evenodd"
    />
  </svg>
);

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.519.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
      clipRule="evenodd"
    />
  </svg>
);

const ClipboardIcon = () => (
  <svg
    className="empty-state-icon"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
    />
  </svg>
);

function App() {
  // Model IS a store, so useSelector works directly
  const { items, loading, error } = useSelector(todoModel);
  const [newTitle, setNewTitle] = useState("");

  // Initial Load - call bound thunk method directly
  useEffect(() => {
    todoModel.fetchTodos();
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    // Call bound thunk method directly
    todoModel.addTodo(newTitle);
    setNewTitle("");
  };

  // Call bound action methods directly - no dispatch needed!
  const handleToggle = (id: number) => {
    todoModel.toggle(id);
  };

  const handleRemove = (id: number) => {
    todoModel.remove(id);
  };

  const completedCount = items.filter((t) => t.completed).length;
  const remainingCount = items.length - completedCount;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">Todo</h1>
        <p className="app-subtitle">Stay organized, get things done</p>
      </header>

      <form className="todo-form" onSubmit={handleAdd}>
        <label htmlFor="todo-input" className="visually-hidden">
          New todo
        </label>
        <input
          id="todo-input"
          type="text"
          className="todo-input"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="What needs to be done?"
        />
        <button type="submit" className="add-button" disabled={loading}>
          <PlusIcon />
          <span>Add</span>
        </button>
      </form>

      {error && (
        <div className="error-state" role="alert">
          Error: {error}
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" aria-hidden="true" />
          <p>Loading todos...</p>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="empty-state">
          <ClipboardIcon />
          <p className="empty-state-text">No todos yet. Add one above!</p>
        </div>
      )}

      {items.length > 0 && (
        <>
          <ul className="todo-list" role="list">
            {items.map((todo) => (
              <li
                key={todo.id}
                className={`todo-item ${todo.completed ? "completed" : ""}`}
              >
                <label className="todo-checkbox">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => handleToggle(todo.id)}
                    aria-label={`Mark "${todo.title}" as ${
                      todo.completed ? "incomplete" : "complete"
                    }`}
                  />
                  <span className="todo-checkbox-visual">
                    <CheckIcon />
                  </span>
                </label>
                <span className="todo-text">{todo.title}</span>
                <button
                  className="delete-button"
                  onClick={() => handleRemove(todo.id)}
                  aria-label={`Delete "${todo.title}"`}
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>

          <div className="todo-stats">
            <span className="todo-count">
              {remainingCount} {remainingCount === 1 ? "item" : "items"} left
            </span>
            <span>{completedCount} completed</span>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
