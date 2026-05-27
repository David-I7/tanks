import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

type ScreenStackContextType<Keys extends string> = {
  pushScreen: (screen: keyof Screens<Keys>, currentScreenState?: any) => void;
  popScreen: () => void;
  screen: React.ReactElement;
  state: any;
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
  ScreenStackContextType<any> | undefined
>(undefined);

function useInitScreenStack<Keys extends string>(
  screens: Screens<Keys>,
): ScreenStackContextType<Keys> {
  const [history, setHistory] = useState<[React.ReactElement, any][]>([]);
  const [currentScreen, setCurrentScreen] = useState<React.ReactElement>(
    screens.root,
  );
  const [currentState, setCurrentState] = useState<any>(null);

  function pushScreen(screen: keyof Screens<Keys>, currentState?: any) {
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

export function useScreenStack<Keys extends string>() {
  const ctx = useContext(ScreenStackContext);
  if (ctx === undefined)
    throw new Error("You must call this hook inside a ScreenStackProvider");
  return ctx as ScreenStackContextType<Keys>;
}

export default function ScreenStackProvider<Keys extends string>({
  screens,
  children,
}: ScreenStackProviderProps<Keys>) {
  return (
    <ScreenStackContext.Provider value={useInitScreenStack(screens)}>
      {children}
    </ScreenStackContext.Provider>
  );
}
