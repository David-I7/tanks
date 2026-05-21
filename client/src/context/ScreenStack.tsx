import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

type ScreenStackContextType = {
  pushScreen: (screen: keyof Screens, currentScreenState?: any) => void;
  popScreen: () => void;
  screen: React.ReactElement;
  state: any;
};

type Screens = {
  root: React.ReactElement;
  [key: string]: React.ReactElement;
};

type ScreenStackProviderProps = {
  screens: Screens;
  children: ReactNode;
};

export const ScreenStackContext = createContext<
  ScreenStackContextType | undefined
>(undefined);

function useInitScreenStack(screens: Screens): ScreenStackContextType {
  const [history, setHistory] = useState<[React.ReactElement, any][]>([]);
  const [currentScreen, setCurrentScreen] = useState<React.ReactElement>(
    screens.root,
  );
  const [currentState, setCurrentState] = useState<any>(null);

  function pushScreen(screen: keyof Screens, currentState?: any) {
    setHistory([...history, [currentScreen, currentState ?? null]]);
    setCurrentScreen(screens[screen]);
    setCurrentState(null);
  }

  function popScreen() {
    if (history.length > 0) {
      const next = [...history];
      const top = next.pop()!;
      setHistory(next);
      setCurrentScreen(top[0]);
      setCurrentState(top[1]);
    }
  }

  return {
    popScreen,
    pushScreen,
    screen: currentScreen,
    state: currentState,
  };
}

export function useScreenStack() {
  const ctx = useContext(ScreenStackContext);
  if (ctx === undefined)
    throw new Error("You must call this hook inside a ScreenStackProvider");
  return ctx;
}

export default function ScreenStackProvider({
  screens,
  children,
}: ScreenStackProviderProps) {
  return (
    <ScreenStackContext.Provider value={useInitScreenStack(screens)}>
      {children}
    </ScreenStackContext.Provider>
  );
}
