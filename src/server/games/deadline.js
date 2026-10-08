export const setDeadline = (state, seconds) => {
  state.deadline = Date.now() + Math.max(1, Number(seconds) || 45) * 1000;
};
