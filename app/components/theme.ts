export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

// Runs in <head> before the page paints: the saved choice, else the device setting.
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
