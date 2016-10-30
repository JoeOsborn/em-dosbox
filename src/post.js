gamecip_ResetGFX = Module.cwrap("gamecip_GFX_ResetScreen", "void", []);
gamecip_ResetLastTick = Module.cwrap("gamecip_ResetLastTick", "void", []);
gamecip_PauseAudio = Module.cwrap("gamecip_PauseAudio", null, ["number"]);
gamecip_ram_ptr = Module.cwrap("gamecip_ram_ptr", "number", []);
gamecip_mem_totalpages = Module.cwrap("gamecip_mem_pages", "number", []);
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

Browser.resizeListeners.push(
    function() {
        if('enforcedWidth' in Module){
            Module.canvas.style.setProperty("width", Module.enforcedWidth, "important");
        }else{
            Module.canvas.style.setProperty( "width", "inherit", "important");
        }
        if('enforcedHeight' in Module){
            Module.canvas.style.setProperty("height", Module.enforcedHeight, "important");
        }else{
            Module.canvas.style.setProperty("height", "inherit", "important");
        }
    }
);
