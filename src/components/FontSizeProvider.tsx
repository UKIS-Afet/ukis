import React, { createContext, useContext, useEffect, useState } from "react";

export type FontSize = "small" | "normal" | "large" | "extra-large";

type FontSizeProviderProps = {
  children: React.ReactNode;
  defaultSize?: FontSize;
  storageKey?: string;
};

type FontSizeProviderState = {
  size: FontSize;
  setSize: (size: FontSize) => void;
};

const initialState: FontSizeProviderState = {
  size: "normal",
  setSize: () => null,
};

const FontSizeProviderContext = createContext<FontSizeProviderState>(initialState);

export function FontSizeProvider({
  children,
  defaultSize = "normal",
  storageKey = "ukis-fontsize",
  ...props
}: FontSizeProviderProps) {
  const [size, setSize] = useState<FontSize>(
    () => (localStorage.getItem(storageKey) as FontSize) || defaultSize
  );

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Default Tailwind root font size is 16px. 
    // We adjust it based on the selected size.
    let rootFontSize = "16px";
    switch (size) {
      case "small":
        rootFontSize = "14px";
        break;
      case "normal":
        rootFontSize = "16px";
        break;
      case "large":
        rootFontSize = "18px";
        break;
      case "extra-large":
        rootFontSize = "20px";
        break;
    }
    
    root.style.fontSize = rootFontSize;
    localStorage.setItem(storageKey, size);
  }, [size, storageKey]);

  const value = {
    size,
    setSize: (size: FontSize) => {
      setSize(size);
    },
  };

  return (
    <FontSizeProviderContext.Provider {...props} value={value}>
      {children}
    </FontSizeProviderContext.Provider>
  );
}

export const useFontSize = () => {
  const context = useContext(FontSizeProviderContext);

  if (context === undefined)
    throw new Error("useFontSize must be used within a FontSizeProvider");

  return context;
};
