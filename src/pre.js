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
Module['saveState'] = function(onSaved) {
    awaitingSaveCallback = onSaved;
}
var awaitingLoadCallback; // State -> void
var awaitingLoadState; // State
Module['loadState'] = function(s, onLoaded) {
    awaitingLoadState = s;
    awaitingLoadCallback = onLoaded;
}

Module['setMuted'] = function(b) {
    gamecip_PauseAudio(b ? 1 : 0);
    Module._isMuted = b;
}

Module['isMuted'] = function() {
    return Module._isMuted;
}

Module['saveExtraFiles'] = function(files, onSaved) {
    if(onSaved) {
        var r = {};
        for(var i = 0; i < files.length; i++) {
            r[files[i]] = FS.readFile(files[i], {encoding:'binary'});
        }
        onSaved(r);
    }
}

//todo: save extra files

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

var gamecip_ResetGFX = null;

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
        gamecip_ResetGFX();
        return true;
    }
}

Module.arguments = (Module.gameFile.match(/\.(exe|com|bat)$/i) ? 
    [Module.gameFile] : 
    ["-c", "mount a .", "-c", "boot a:" + Module.gameFile + ""]);

Module.preRun.push(function() {
    ENV.SDL_EMSCRIPTEN_KEYBOARD_ELEMENT = Module.targetID;
    var freezeFile = Module["freezeFile"];
    var extraFiles = Module["extraFiles"] || {};
    if(freezeFile) {
        Module.postRun.push(function() {
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (xhr.readyState !== XMLHttpRequest.DONE) {
                    return;
                }
                if (xhr.status !== 200) {
                    return;
                }
                loadState(xhr.response, function(s) { console.log("DOSBOX loaded state " +freezeFile); });
            };
            xhr.open('GET', freezeFile, true);
            xhr.responseType = 'arraybuffer';
            xhr.send(null);
        })
    }
    for(k in extraFiles) {
        if(extraFiles.hasOwnProperty(k)) {
            var targetPath = k;
            var lastSlash = k.lastIndexOf("/");
            var targetBase = (lastSlash == -1) ? "/" : k.slice(0,lastSlash+1);
            var targetName = k.slice(lastSlash+1);
            var srcPath = extraFiles[k];
            FS.createPreloadedFile(targetBase, targetName, srcPath, true, true);
        }
    }
});

Module.postRun.push(function() {
    Module.setMuted(true);
});