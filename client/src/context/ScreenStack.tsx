import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

type ScreenStackContextType<Keys extends string> = {
  pushScreen: (screen: keyof Screens<Keys>, currentScreenState?: unknown) => void;
  popScreen: () => void;
  screen: React.ReactElement;
  state: unknown;
};

type Screens<Keys extends string> = {
  [key in Keys]: React.ReactElement;
} & {
  root: React.ReactElement;
};

type ScreenStackProviderProps<Keys extends string> = {
  screens: Screens<Keys>;
  children: ReactNode;
};

export const ScreenStackContext = createContext<
  ScreenStackContextType<string> | undefined
>(undefined);

function useInitScreenStack<Keys extends string>(
  screens: Screens<Keys>,
): ScreenStackContextType<Keys> {
  const [history, setHistory] = useState<[React.ReactElement, unknown][]>([]);
  const [currentScreen, setCurrentScreen] = useState<React.ReactElement>(
    screens.root,
  );
  const [currentState, setCurrentState] = useState<unknown>(null);

  function pushScreen(screen: keyof Screens<Keys>, state?: unknown) {
    setHistory([...history, [currentScreen, currentState]]);
    setCurrentScreen(screens[screen]);
    setCurrentState(state ?? null);
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

export function ScreenStackProvider<Keys extends string>({
  screens,
  children,
}: ScreenStackProviderProps<Keys>) {
  const value = useInitScreenStack(screens);
  return (
    <ScreenStackContext.Provider
      value={value as unknown as ScreenStackContextType<string>}
    >
      {children}
    </ScreenStackContext.Provider>
  );
}

export default ScreenStackProvider;

export function useScreenStack<Keys extends string>() {
  const context = useContext(ScreenStackContext);
  if (!context) {
    throw new Error("useScreenStack must be used within a ScreenStackProvider");
  }
  return context as ScreenStackContextType<Keys>;
}
