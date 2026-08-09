"use strict";

const SERVER = "http://localhost:4450";
const MAX_CHARS = 5000;

const MENU_ID = "zhong-teach";

chrome.runtime.onInstalled.addListener(setupMenus);
chrome.runtime.onStartup.addListener(setupMenus);

function setupMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "仲 Zhōng — teach this text",
      contexts: ["selection"],
    });
  });
}

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== MENU_ID) return;
  const text = (info.selectionText ?? "").trim().slice(0, MAX_CHARS);
  if (!text) return;

  if (await serverUp()) {
    chrome.tabs.create({ url: `${SERVER}/?text=${encodeURIComponent(text)}` });
  } else {
    chrome.notifications.create("zhong-offline", {
      type: "basic",
      iconUrl: "icons/128.png",
      title: "Zhōng server is not running",
      message: "Run `zhong` in a terminal to start it, then try again.",
    });
  }
});

function serverUp() {
  return new Promise((resolve) => {
    fetch(`${SERVER}/api/health`, { signal: AbortSignal.timeout(2000) })
      .then((r) => resolve(r.ok))
      .catch(() => resolve(false));
  });
}