gamecip_ResetGFX = Module.cwrap("gamecip_GFX_ResetScreen", "void", []);
(function() {
    var realHandle = EmterpreterAsync.handle;
    EmterpreterAsync.handle = function(doAsyncOp, yieldDuring) {
        if(EmterpreterAsync.state === 0) {
            maybeSaveState();
            maybeLoadState();
        }
        realHandle(doAsyncOp, yieldDuring);
    };
})();