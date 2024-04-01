import * as vscode from 'vscode'
import { producerCollection } from './producer'
import { ActiveEvent, Exporter, EventData } from './types'
import { WebSocket } from 'ws'
import * as CryptoJS from 'crypto-js'
import { publishEvent } from './exporters'
let nextId = 1
let uri2Id: { [key: string]: number } = {}

function updateAndGetId(uri: string) {
  if (!uri2Id.hasOwnProperty(uri)) uri2Id[uri] = nextId++
  return uri2Id[uri]
}
export function activate(context: vscode.ExtensionContext) {
  const activeEvents: ActiveEvent[] | undefined = vscode.workspace
    .getConfiguration('telemetry')
    .get('activeEvents')
  const exporters: Exporter[] | undefined = vscode.workspace
    .getConfiguration('telemetry')
    .get('exporters')

  const processedExporters =
    activeEvents && activeEvents.length
      ? exporters?.map((e) => {
          if (!e.activeEvents) {
            e.activeEvents = activeEvents
            return e
          } else {
            return e
          }
        })
      : exporters?.filter((e) => e.activeEvents && e.activeEvents.length)
  // Exporters without specifying the corresponding activeEvents will use the global activeEvents configuration.
  // When the global activeEvents configuration is null, exporters that do not have corresponding activeEvents will be ignored.

  const exporterIds = processedExporters
    ?.map((each) => each.args?.id)
    .filter((e) => e !== undefined)
  vscode.env.isTelemetryEnabled
    ? vscode.window.showInformationMessage(`Telemetry extension is installed.`)
    : console.log('Telemetry extension is disabled')
  vscode.env.onDidChangeTelemetryEnabled((e: boolean) =>
    e
      ? vscode.window.showInformationMessage(
          `Telemetry extension is installed.`
        )
      : vscode.window.showInformationMessage('Telemetry extension is disabled.')
  )

  processedExporters?.forEach((exporter) => {
    producerCollection.forEach((producer) => {
      if (exporter.activeEvents?.map((o) => o.name).includes(producer.id)) {
        new producer().listen(context, exporter)
      }
    })
  })
  const clientId = vscode.env.machineId
  const socket = new WebSocket('ws://localhost:8080?clientId=' + clientId)
  console.log('Connecting to server', socket)
  socket.on('open', () => {
    console.log('Connected to server')
  })

  socket.addEventListener('message', (event) => {
    const data_string =
      typeof event.data === 'string'
        ? JSON.parse(event.data)
        : JSON.parse(event.data.toString())
    console.log('Message from server ', data_string)
    const filePath = data_string
    try {
      const uri = vscode.Uri.parse(data_string)
      const filePath = uri.fsPath
      vscode.workspace.openTextDocument(filePath).then((document) => {
        const id = updateAndGetId(document.uri.toString())
        const rangestart = new vscode.Position(0, 0)
        const rangeend = new vscode.Position(0, 0)
        const hash = CryptoJS.SHA256(document.getText()).toString()
        const eventdata: EventData = {
          eventName: 'reopen',
          eventTime: Date.now(),
          sessionId: vscode.env.sessionId,
          machineId: vscode.env.machineId,
          documentUri: document.uri.toString(),
          documentLanguageId: document.languageId,
          documentId: id,
          operation: 'open',
          value: document.getText(),
          rangeOffset: '0',
          rangeLength: '0',
          rangestart_line: rangestart.line.toString(),
          rangestart_character: rangestart.character.toString(),
          rangeend_line: rangeend.line.toString(),
          rangeend_character: rangeend.character.toString(),
          hash: hash,
        }
        exporters?.forEach((exporter) => publishEvent(eventdata, exporter))
      })
    } catch (error) {
      console.error('Error opening document:', error)
    }
  })
}

export function deactivate() {}
