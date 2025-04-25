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
      width: 600,
      height: "auto",
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


Hooks.on("ready", () => {
    game.tileSubmenu = {
      showMenu: async (token) => {
        const html = await renderTemplate("modules/tile-submenu/templates/submenu.html", {});
        new Dialog({
          title: "Tile Interaction",
          content: html,
          buttons: {},
          render: html => {
            html.find("button").on("click", async (e) => {
              const action = e.currentTarget.dataset.action;
              const actor = token.actor;
  
              const DC = {
                perception: 14,
                investigation: 15,
                unlock: 16,
                disarm: 17
              };
  
              switch (action) {
                case "perception":
                case "investigation":
                  const skill = action === "perception" ? "per" : "inv";
                  const result = await actor.rollSkill(skill);
                  ui.notifications.info(`${actor.name} rolled ${result.total} for ${action}`);
                  break;
  
                case "unlock":
                case "disarm":
                  if (!actor.items.find(i => i.name.includes("Thieves' Tools"))) {
                    ui.notifications.warn(`${actor.name} has no Thieves' Tools!`);
                    return;
                  }
                  const toolCheck = await actor.rollSkill("sle");
                  ui.notifications.info(`${actor.name} attempts to ${action}, rolled ${toolCheck.total}`);
                  break;
  
                case "attack":
                  ChatMessage.create({
                    content: `${actor.name} strikes the object with a melee attack!`
                  });
                  break;
              }
            });
          }
        }).render(true);
      }
    };
  
    // OPTIONAL: Connect submenu to a tile trigger
    Hooks.on("clickTile", async (tile, event) => {
      const controlled = canvas.tokens.controlled[0];
      if (controlled) {
        await game.tileSubmenu.showMenu(controlled);
      } else {
        ui.notifications.warn("You must select a token.");
      }
    });
  });

  Hooks.on("getSceneControlButtons", controls => {
    const tileControls = controls.find(c => c.name === "tiles");
    if (!tileControls || !game.user.isGM) return;
  
    tileControls.tools.push({
      name: "submenuConfig",
      title: "Configure Tile Submenu",
      icon: "fas fa-sliders-h",
      visible: game.user.isGM,
      onClick: () => {
        const tile = canvas.tiles.controlled[0];
        if (!tile) return ui.notifications.warn("Please select a tile first.");
        new TileSubmenuConfig(tile).render(true);
      }
    });
  });
  
  