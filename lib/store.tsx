"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import type {
  AppState,
  CentroComercial,
  Datafono,
  Transaccion,
  Remanente,
  ArchivoImportado,
} from "./types";
import { CENTROS_INICIALES } from "./constants";
import {
  saveStateToIndexedDB,
  loadStateFromIndexedDB,
  isIndexedDBAvailable,
} from "./indexed-db-storage";

const STORAGE_KEY = "datafonos-app-state";

const initialState: AppState = {
  centros: CENTROS_INICIALES,
  datafonos: [],
  transacciones: [],
  remanentes: [],
  archivosImportados: [],
};

type Action =
  | { type: "SET_STATE"; payload: AppState }
  | { type: "SET_CENTROS"; payload: CentroComercial[] }
  | { type: "UPDATE_CENTRO"; payload: CentroComercial }
  | { type: "ADD_DATAFONOS"; payload: Datafono[] }
  | { type: "UPDATE_DATAFONO"; payload: Datafono }
  | { type: "DELETE_DATAFONO"; payload: string }
  | { type: "SET_DATAFONOS"; payload: Datafono[] }
  | { type: "ADD_TRANSACCIONES"; payload: Transaccion[] }
  | { type: "CLEAR_TRANSACCIONES" }
  | { type: "ADD_REMANENTES"; payload: Remanente[] }
  | { type: "CLEAR_REMANENTES" }
  | { type: "ADD_ARCHIVO"; payload: ArchivoImportado }
  | { type: "DELETE_ARCHIVO"; payload: string }
  | { type: "RESET_STATE" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_STATE":
      return action.payload;
    case "SET_CENTROS":
      return { ...state, centros: action.payload };
    case "UPDATE_CENTRO":
      return {
        ...state,
        centros: state.centros.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };
    case "ADD_DATAFONOS":
      return {
        ...state,
        datafonos: [
          ...state.datafonos.filter(
            (d) =>
              !action.payload.some((p) => p.codEstablecimiento === d.codEstablecimiento)
          ),
          ...action.payload,
        ],
      };
    case "UPDATE_DATAFONO":
      return {
        ...state,
        datafonos: state.datafonos.map((d) =>
          d.codEstablecimiento === action.payload.codEstablecimiento ? action.payload : d
        ),
      };
    case "DELETE_DATAFONO":
      return {
        ...state,
        datafonos: state.datafonos.filter(
          (d) => d.codEstablecimiento !== action.payload
        ),
      };
    case "SET_DATAFONOS":
      return { ...state, datafonos: action.payload };
    case "ADD_TRANSACCIONES":
      return {
        ...state,
        transacciones: [...state.transacciones, ...action.payload],
      };
    case "CLEAR_TRANSACCIONES":
      return { ...state, transacciones: [] };
    case "ADD_REMANENTES":
      return { ...state, remanentes: [...state.remanentes, ...action.payload] };
    case "CLEAR_REMANENTES":
      return { ...state, remanentes: [] };
    case "ADD_ARCHIVO":
      return {
        ...state,
        archivosImportados: [...state.archivosImportados, action.payload],
      };
    case "DELETE_ARCHIVO":
      return {
        ...state,
        archivosImportados: state.archivosImportados.filter(
          (a) => a.id !== action.payload
        ),
        transacciones:
          state.archivosImportados.find((a) => a.id === action.payload)?.tipo ===
          "transaccion"
            ? state.transacciones.filter((t) => t.archivoId !== action.payload)
            : state.transacciones,
        remanentes:
          state.archivosImportados.find((a) => a.id === action.payload)?.tipo ===
          "remanente"
            ? state.remanentes.filter((r) => r.archivoId !== action.payload)
            : state.remanentes,
      };
    case "RESET_STATE":
      return initialState;
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  isLoaded: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced save function to avoid too many IndexedDB writes
  const debouncedSave = useCallback((stateToSave: AppState) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveStateToIndexedDB(stateToSave).catch(() => {
        // Silently fail - IndexedDB errors shouldn't break the app
      });
    }, 500); // Debounce by 500ms
  }, []);

  // Load from IndexedDB on mount (with localStorage fallback for migration)
  useEffect(() => {
    async function loadState() {
      try {
        // First try IndexedDB
        if (isIndexedDBAvailable()) {
          const indexedDBState = await loadStateFromIndexedDB();
          if (indexedDBState) {
            // Merge with initial centros to ensure new centros are added
            const mergedCentros = CENTROS_INICIALES.map((inicial) => {
              const stored = indexedDBState.centros.find((c) => c.id === inicial.id);
              return stored || inicial;
            });
            dispatch({
              type: "SET_STATE",
              payload: { ...indexedDBState, centros: mergedCentros },
            });
            setIsLoaded(true);
            return;
          }
        }

        // Fallback: try localStorage (for migration from old storage)
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as AppState;
          // Merge with initial centros
          const mergedCentros = CENTROS_INICIALES.map((inicial) => {
            const storedCentro = parsed.centros.find((c) => c.id === inicial.id);
            return storedCentro || inicial;
          });
          const migratedState = { ...parsed, centros: mergedCentros };
          dispatch({
            type: "SET_STATE",
            payload: migratedState,
          });
          
          // Migrate to IndexedDB and clear localStorage
          if (isIndexedDBAvailable()) {
            await saveStateToIndexedDB(migratedState);
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch {
        // Silently fail - storage errors shouldn't break the app
      }
      setIsLoaded(true);
    }
    
    loadState();
  }, []);

  // Save to IndexedDB on state change (debounced)
  useEffect(() => {
    if (isLoaded && isIndexedDBAvailable()) {
      debouncedSave(state);
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state, isLoaded, debouncedSave]);

  return (
    <AppContext.Provider value={{ state, dispatch, isLoaded }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppStore must be used within an AppProvider");
  }
  return context;
}
