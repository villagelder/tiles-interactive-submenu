class TileSubmenuConfig extends FormApplication {
    constructor(tile) {
      super(tile);
      this.tile = tile;
    }
  
    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
        title: "Tile Submenu Configuration",
        id: "tile-submenu-config",
        template: "modules/tiles-interactive-submenu/templates/config.html",
        width: 720,
        height: "auto",
        submitOnChange: false
      });
    }
  
    getData() {
      return {
        actions: this.tile.document.getFlag("tiles-interactive-submenu", "actions") || []
      };
    }
  
    async _updateObject(event, formData) {
      const data = expandObject(formData);
      await this.tile.document.setFlag("tiles-interactive-submenu", "actions", data.actions);
    }
  }
  