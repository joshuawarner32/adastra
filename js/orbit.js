var domView = L.domView("#gameview");
var scene = L.scene(function (stage) {
    stage.insert(new L.Ball());
});

domView.showScene(scene);