import { ipcMain } from "electron";
import { AppState, getStore } from "../app-state";

export const registerOnboardingHandlers = (): void => {
  const store = getStore();

  ipcMain.handle("get-onboarding-complete", () => {
    return AppState.onboardingComplete;
  });

  ipcMain.on("set-onboarding-complete", (_, complete: boolean) => {
    AppState.onboardingComplete = complete;
    store.set("onboardingComplete", complete);
  });
};
