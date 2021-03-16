/*
    Copyright 2018-2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

import {
  RhinoEngine,
  RhinoWorkerRequestInit,
  RhinoWorkerResponseReady,
  WorkerRequestProcess,
  WorkerRequestVoid,
  RhinoWorkerResponseInference,
  RhinoArgs
} from './rhino_types';

// @ts-ignore
import Rhino from './rhino';

let paused = true;
let rhinoEngine: RhinoEngine = null;

async function init(rhinoArgs: RhinoArgs): Promise<void> {
  rhinoEngine = await Rhino.create(rhinoArgs.context);
  paused = !rhinoArgs.start;
  const rhnReadyMessage: RhinoWorkerResponseReady = {
    command: 'rhn-ready',
  };
  postMessage(rhnReadyMessage, undefined);
}

function process(inputFrame: Int16Array): void {
  if (rhinoEngine !== null && !paused) {
    const inference = rhinoEngine.process(inputFrame);
    if (inference.isFinalized) {
      const rhinoInferenceMessage: RhinoWorkerResponseInference = {
        command: 'rhn-inference',
        inference: inference
      };
      postMessage(rhinoInferenceMessage, undefined);
    }
  }
}

function release(): void {
  if (rhinoEngine !== null) {
    rhinoEngine.release();
  }

  rhinoEngine = null;
  close();
}

onmessage = function (
  event: MessageEvent<
    WorkerRequestVoid | WorkerRequestProcess | RhinoWorkerRequestInit
  >
): void {
  switch (event.data.command) {
    case 'init':
      init(event.data.rhinoArgs);
      break;
    case 'process':
      process(event.data.inputFrame);
      break;
    case 'pause':
      paused = true;
      break;
    case 'resume':
      paused = false;
      break;
    case 'release':
      release();
      break;
    default:
      console.warn(
        'Unhandled command in rhino_worker: ' + event.data.command
      );
  }
};