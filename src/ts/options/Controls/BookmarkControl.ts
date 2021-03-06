import { Option } from "../OptionTypeDefinition.js";
import { OptionUpdateEvent, Message } from "../../messages/Messages.js";
import * as OptionsManager from "../OptionsManager.js";

let optionIdFolderViewMap:Map<string, HTMLDivElement> = new Map<string, HTMLDivElement>();
let instanceCounter = 0;

browser.runtime.onMessage.addListener((message:Message) => {
    if(message.type === "OptionUpdate") {
        let msg:OptionUpdateEvent = message as OptionUpdateEvent;

        if(optionIdFolderViewMap.has(msg.key)) {
            let view:HTMLDivElement = optionIdFolderViewMap.get(msg.key);

            updateFolderView(view, msg.newValue);
        }
    }
});

export async function create(row:HTMLDivElement, option:Option):Promise<void> {
    instanceCounter++;
    const i18nMessageName = "option_" + option.id;
    const bookmarkId = await OptionsManager.getValue<string>(option.id);

    let folderView:HTMLDivElement = document.createElement("div");
    folderView.title = browser.i18n.getMessage("bookmarkFolderSelector_tooltip");
    folderView.id = "bmBox" + instanceCounter;
    folderView.setAttribute("data-bmId", "");
    folderView.classList.add("bookmarkFolderView");

    updateFolderView(folderView, bookmarkId);

    folderView.addEventListener("click", () => selectBookmark(option.id));

    let label:HTMLLabelElement = document.createElement("label");
    label.setAttribute("for", folderView.id);
    label.innerText = browser.i18n.getMessage(i18nMessageName);

    row.appendChild(label);
    row.appendChild(folderView);
    
    optionIdFolderViewMap.set(option.id, folderView);
}

async function updateFolderView(view:HTMLDivElement, bookmarkId:string) {
    if(bookmarkId) {
        browser.bookmarks.get(bookmarkId).then(res => {
            let title:string = res[0].title;
            view.innerText = title;
        }, () => {
            console.error(`[TA] Bookmark folder (id: ${bookmarkId}) not found.`);
            view.innerText = browser.i18n.getMessage("bookmarkFolderSelector_missing");
        });
    } else {
        view.innerText = "-";
    }

    view.setAttribute("data-bmId", bookmarkId);
}

/**
 * Opens the bookmark selector and returns a promise that resolves when the BMS is closed
 * @param optionId 
 */
export async function selectBookmark(optionId:string):Promise<void> {
    let url = browser.runtime.getURL("html/bookmark-selector.html");
        url += "?option=" + encodeURIComponent(optionId);

    let bmsWindow:browser.windows.Window = await browser.windows.create({
        //focused: true, // not supported by FF
        allowScriptsToClose: true,
        width: 500,
        height: 300,
        titlePreface: "Tabs Aside! ",
        type: "popup",
        url: url
    });

    return new Promise(resolve => {
        function onWindowClosed(windowId:number) {
            if(windowId === bmsWindow.id) {
                browser.windows.onRemoved.removeListener(onWindowClosed);
                resolve();
            }
        }
    
        browser.windows.onRemoved.addListener(onWindowClosed);
    });
}
