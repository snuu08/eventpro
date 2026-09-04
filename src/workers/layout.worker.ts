import { generateLayoutCandidates, type AutoLayoutInput, type AutoLayoutResult } from "../layout/autoLayout";

self.onmessage = (event: MessageEvent<AutoLayoutInput>) => {
  const result: AutoLayoutResult = generateLayoutCandidates(event.data);
  self.postMessage(result);
};
