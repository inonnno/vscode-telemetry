import * as vscode from "vscode";
import { EventData } from "./types";
import { sendEvent } from "./exporters";

let nextId = 1;
let uri2Id: { [key: string]: number } = {};

function updateAndGetId(uri: string) {
  if (!uri2Id.hasOwnProperty(uri)) uri2Id[uri] = nextId++;
  return uri2Id[uri];
}

export function handleDocumentOpen(
  document: vscode.TextDocument,
  megaphone?: vscode.StatusBarItem,
) {
  if (
    !vscode.env.isTelemetryEnabled ||
    !vscode.workspace
      .getConfiguration("telemetry.activeEvents")
      .get("documentOpen") ||
    document.uri.scheme !== "file"
  ) {
    return;
  }
  const id = updateAndGetId(document.uri.toString());
  const documentContent = document.getText();

  if (megaphone) {
    megaphone.text = `$(megaphone) Document ${id} (${
      document.fileName
    }) Open: ${documentContent.split("\n")[0]}`;
  }

  const event: EventData = {
    eventName: "documentOpen",
    eventTime: Date.now(),
    sessionId: vscode.env.sessionId,
    machineId: vscode.env.machineId,
    documentUri: document.uri.toString(),
    documentId: id,
    documentContent: documentContent,
  };
  sendEvent(event);
}

export function handleDocumentChange(
  e: vscode.TextDocumentChangeEvent,
  megaphone: vscode.StatusBarItem,
) {
  if (
    !vscode.env.isTelemetryEnabled ||
    !vscode.workspace
      .getConfiguration("telemetry.activeEvents")
      .get("documentChange") ||
    e.document.uri.scheme !== "file"
  ) {
    return;
  }
  const id = updateAndGetId(e.document.uri.toString());
  if (e.contentChanges.length > 0) {
    // For megaphone
    e.contentChanges.forEach((change) => {
      if (change && change.hasOwnProperty("text")) {
        const { text, range } = change;
        if (range.start.isEqual(range.end)) {
          megaphone.text = `$(megaphone) Document ${id} Add: ${text}`;
        } else if (text === "") {
          megaphone.text = `$(megaphone) Document ${id} Delete`;
        } else {
          megaphone.text = `$(megaphone) Document ${id} Replace: ${text}`;
        }
      }
    });

    // For dashboard
    const event: EventData = {
      eventName: "documentChange",
      eventTime: Date.now(),
      sessionId: vscode.env.sessionId,
      machineId: vscode.env.machineId,
      documentUri: e.document.uri.toString(),
      documentId: id,
      documentChanges: JSON.stringify(e.contentChanges),
    };
    sendEvent(event);
  }
}

export function handleDocumentClose(
  document: vscode.TextDocument,
  megaphone: vscode.StatusBarItem,
) {
  if (
    !vscode.env.isTelemetryEnabled ||
    !vscode.workspace
      .getConfiguration("telemetry.activeEvents")
      .get("documentClose") ||
    document.uri.scheme !== "file"
  ) {
    return;
  }
  const id = updateAndGetId(document.uri.toString());
  megaphone.text = `$(megaphone) Document ${id} Close`;
  const event: EventData = {
    eventName: "documentClose",
    eventTime: Date.now(),
    sessionId: vscode.env.sessionId,
    machineId: vscode.env.machineId,
    documentUri: document.uri.toString(),
    documentId: id,
  };
  sendEvent(event);
}

export function handleDocumentSave(
  document: vscode.TextDocument,
  megaphone: vscode.StatusBarItem,
) {
  if (
    !vscode.env.isTelemetryEnabled ||
    !vscode.workspace
      .getConfiguration("telemetry.activeEvents")
      .get("documentSave") ||
    document.uri.scheme !== "file"
  ) {
    return;
  }
  const id = updateAndGetId(document.uri.toString());
  megaphone.text = `$(megaphone) Document ${id} Save`;
  const event: EventData = {
    eventName: "documentSave",
    eventTime: Date.now(),
    sessionId: vscode.env.sessionId,
    machineId: vscode.env.machineId,
    documentUri: document.uri.toString(),
    documentId: id,
  };
  sendEvent(event);
}