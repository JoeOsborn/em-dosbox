// Don't copy canvas image back into RAM in SDL_LockSurface()
Module['screenIsReadOnly'] = true;
// set nearest neighbor scaling, for sharply upscaled pixels
var canvasStyle = Module['canvas'].style;
canvasStyle.imageRendering = "optimizeSpeed";
canvasStyle.imageRendering = "-moz-crisp-edges";
canvasStyle.imageRendering = "-o-crisp-edges";
canvasStyle.imageRendering = "-webkit-optimize-contrast";
canvasStyle.imageRendering = "optimize-contrast";
canvasStyle.imageRendering = "crisp-edges";
canvasStyle.imageRendering = "pixelated";
// start at 0 : now = 0
// save at 10 : now = 10
// load at 50 : now = 10 = realNow - (loadTime - saveTime)

var loadedTime = 0, savedTime = 0; //wallclock time and game time, respectively
var gcip_realNow = Date.now; //wallclock time
Date.now = function() { //game time
    return gcip_realNow() - loadedTime + savedTime;
}

var awaitingSaveCallback; // State -> void
window['saveState'] = function(onSaved) {
    awaitingSaveCallback = onSaved;
}
var awaitingLoadCallback; // State -> void
var awaitingLoadState; // State
window['loadState'] = function(s, onLoaded) {
    awaitingLoadState = s;
    awaitingLoadCallback = onLoaded;
}

function maybeSaveState() {
    if(awaitingSaveCallback) {
        console.log("State",EmterpreterAsync.state);
        assert(Module.buffer);
        //store current time and heap
        var state = {
            time: Date.now(), // game time
            heap: Module.buffer.slice(0),
            stack: asm.stackSave(),
            emtStack: asm.emtStackSave()
        };
        var cb = awaitingSaveCallback;
        awaitingSaveCallback = null;
        cb(state);
    }
}

function maybeLoadState() {
    if(awaitingLoadCallback) {
        assert(awaitingLoadState);
        loadedTime = gcip_realNow(); //wallclock time
        savedTime = awaitingLoadState.time; //game time
        //reset heap
        
        var b = new Uint8Array(awaitingLoadState.heap); // awaitingLoadState.heap
        HEAP8.set(b);
        
        asm.stackRestore(awaitingLoadState.stack);
        asm.emtStackRestore(awaitingLoadState.emtStack);
        
        //call callback
        var cb = awaitingLoadCallback;
        awaitingLoadCallback = null;
        var s = awaitingLoadState;
        awaitingLoadState = null;
        cb(s);
        resetGFX();
        return true;
    }
}

var resetGFX;
window['initSaveLoadState'] = function() {
    resetGFX = Module.cwrap("gamecip_GFX_ResetScreen", "void", []);
    var realHandle = EmterpreterAsync.handle;
    EmterpreterAsync.handle = function(doAsyncOp, yieldDuring) {
        if(EmterpreterAsync.state === 0) {
            maybeSaveState();
            maybeLoadState();
        }
        realHandle(doAsyncOp, yieldDuring);
    };
}