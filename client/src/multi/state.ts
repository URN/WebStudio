import { createMultiState } from "webstudio-common";
export type { MultiState } from "webstudio-common";
export { MultiConnectionState } from "webstudio-common";

const multiState = createMultiState("host");

export default multiState.reducer;

export const actions = multiState.actions;
export const multiServerMiddleware = multiState.middleware;
