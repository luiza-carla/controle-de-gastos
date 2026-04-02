// Wrapper para capturar erros de handlers async e repassar ao middleware de erro
function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function criarHandlerDeController(controller) {
  return function handlerDoMetodo(methodName) {
    const method = controller?.[methodName];

    if (typeof method !== 'function') {
      throw new TypeError(
        `Metodo ${methodName} nao encontrado no controller informado`
      );
    }

    return asyncHandler((req, res, next) =>
      method.call(controller, req, res, next)
    );
  };
}

asyncHandler.controller = criarHandlerDeController;

module.exports = asyncHandler;
