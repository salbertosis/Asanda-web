import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  isCommandOutcome,
  unknownOutcome,
} from "../services/admin/commandOutcome.js";

const AdminCommandContext = createContext(null);
const defaultMessages = {
  confirmed: "La acción se confirmó correctamente.",
  rejected: "La acción fue rechazada y no se aplicaron cambios.",
  unknown: "No pudimos confirmar si la acción se aplicó.",
};

const ConfirmationDialog = ({ request, onClose }) => {
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose(false);
      if (event.key !== "Tab") return;
      const next = event.shiftKey ? confirmRef.current : cancelRef.current;
      const edge = event.shiftKey ? cancelRef.current : confirmRef.current;
      if (document.activeElement === edge) {
        event.preventDefault();
        next?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
      <section
        aria-describedby="admin-confirmation-description"
        aria-labelledby="admin-confirmation-title"
        aria-modal="true"
        className="w-full max-w-md rounded-lg bg-white p-6 text-asanda-ink shadow-xl dark:bg-dark-surface dark:text-dark-text"
        role="dialog"
      >
        <h2 id="admin-confirmation-title" className="text-xl font-bold">
          {request.title}
        </h2>
        <p id="admin-confirmation-description" className="mt-3 leading-6">
          {request.description}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => onClose(false)}
            className="min-h-11 rounded border border-asanda-line px-4 font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {request.cancelLabel || "Cancelar"}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onClose(true)}
            className="min-h-11 rounded bg-asanda-orange-strong px-4 font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {request.confirmLabel || "Confirmar"}
          </button>
        </div>
      </section>
    </div>
  );
};

export const AdminCommandProvider = ({ children }) => {
  const [pending, setPending] = useState(() => new Set());
  const [feedback, setFeedback] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const pendingKeys = useRef(new Set());

  const closeConfirmation = useCallback(
    (confirmed) => {
      confirmation?.resolve(confirmed);
      confirmation?.invoker?.focus();
      setConfirmation(null);
    },
    [confirmation],
  );

  const requestConfirmation = useCallback(
    (details) =>
      new Promise((resolve) =>
        setConfirmation({
          ...details,
          invoker: document.activeElement,
          resolve,
        }),
      ),
    [],
  );

  const runCommand = useCallback(
    async (options) => {
      const { key, command, confirmation: confirm, messages = {} } = options;
      if (!key || typeof command !== "function")
        throw new TypeError("runCommand requires a key and command.");
      if (pendingKeys.current.has(key)) return null;
      if (confirm && !(await requestConfirmation(confirm))) return null;

      pendingKeys.current.add(key);
      setPending(new Set(pendingKeys.current));
      let result;
      try {
        result = await command();
      } catch {
        result = unknownOutcome();
      }
      if (!isCommandOutcome(result)) result = unknownOutcome();

      const copy = { ...defaultMessages, ...messages };
      let nextFeedback = { kind: result.outcome, text: copy[result.outcome] };
      if (result.outcome === "confirmed") {
        options.onConfirmed?.(result.value);
        if (options.readback) {
          try {
            await options.readback();
          } catch {
            nextFeedback = {
              ...nextFeedback,
              text: `${nextFeedback.text} No pudimos actualizar la vista.`,
              action: { label: "Volver a cargar", run: options.readback },
            };
          }
        }
      } else if (result.outcome === "unknown") {
        nextFeedback.text = `${nextFeedback.text} No repitas la acción; verificá primero el estado actual.`;
        if (options.reconcile)
          nextFeedback.action = {
            label: "Verificar estado",
            run: options.reconcile,
          };
      }
      setFeedback(nextFeedback);
      pendingKeys.current.delete(key);
      setPending(new Set(pendingKeys.current));
      return result;
    },
    [requestConfirmation],
  );

  const runFeedbackAction = async () => {
    try {
      await feedback.action.run();
      setFeedback(null);
    } catch {
      setFeedback((current) => ({
        ...current,
        action: null,
        text: `${current.text} La consulta sigue sin estar disponible.`,
      }));
    }
  };

  return (
    <AdminCommandContext.Provider
      value={{ isPending: (key) => pending.has(key), runCommand }}
    >
      {children}
      {feedback && (
        <div
          role={feedback.kind === "confirmed" ? "status" : "alert"}
          className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-xl rounded border border-asanda-line bg-white p-4 shadow-lg dark:border-slate-600 dark:bg-dark-surface"
        >
          <p>{feedback.text}</p>
          {feedback.action && (
            <button
              type="button"
              onClick={runFeedbackAction}
              className="mt-2 min-h-11 font-bold text-asanda-deep underline dark:text-cyan-200"
            >
              {feedback.action.label}
            </button>
          )}
        </div>
      )}
      {confirmation && (
        <ConfirmationDialog
          request={confirmation}
          onClose={closeConfirmation}
        />
      )}
    </AdminCommandContext.Provider>
  );
};

export const useAdminCommand = () => {
  const value = useContext(AdminCommandContext);
  if (!value)
    throw new Error(
      "useAdminCommand must be used inside AdminCommandProvider.",
    );
  return value;
};
