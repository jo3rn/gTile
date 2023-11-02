import GObject from 'gi://GObject?version=2.0';
import St from 'gi://St?version=13';

import { GridSelection, GridSize } from '../types/grid.js';
import { Theme } from '../types/theme.js';
import ButtonBar from './overlay/ButtonBar.js';
import Container from './overlay/Container.js';
import Grid from './overlay/Grid.js';
import TextButton from './overlay/TextButton.js';
import TitleBar from './overlay/TitleBar.js';

const TABLE_WIDTH = 320;

export interface OverlayParams extends St.BoxLayout.ConstructorProperties {
  theme: Theme;

  /**
   * Overlay title displayed next to the close button.
   */
  title: string;

  /**
   * The grid size presets. The overlay will initialize the grid with the first
   * preset in the list.
   */
  presets: GridSize[];

  /**
   * The grid aspect ratio (width/height).
   */
  gridAspectRatio: number;

  /**
   * Optional. The initial area of highlighted tiles in the grid.
   */
  gridSelection?: GridSelection | null;
}

/**
 * The gTile overlay user interface.
 *
 * The overlay consists of
 *   - a title bar with a close button and a window title
 *   - an interactive grid with user-defined dimensions
 *   - a list of preset buttons to change the grid dimension
 *   - a list of arbitrary action buttons
 *
 * The overlay is self-contained in that it orchestrates the components listed
 * above, i.e., it acts upon a click on the close button by closing itself and
 * it also updates the grid size when one of the preset buttons is clicked.
 * Parent components can use the regular GObject mechanisms, namely the
 * `notify::<prop-name>` signal, to get notified about these changes. The
 * `close` event is not directly exposed and instead the `visible` property can
 * be watched.
 *
 * The overlay forwards the GObject properties and signals from {@link Grid}.
 */
export default GObject.registerClass({
  GTypeName: "GTileOverlay",
  Properties: {
    /**
     * Forwarded from {@link Grid}.
     */
    "grid-size": GObject.ParamSpec.jsobject(
      "grid-size",
      "Grid size",
      "The dimension of the grid in terms of columns and rows",
      GObject.ParamFlags.READWRITE,
    ),
    /**
     * Forwarded from {@link Grid}.
     */
    "grid-selection": GObject.ParamSpec.jsobject(
      "grid-selection",
      "Grid selection",
      "A rectangular tile selection within the grid",
      GObject.ParamFlags.READWRITE,
    ),
  },
  Signals: {
    /**
     * Forwarded from {@link Grid}.
     */
    selected: {},
  }
}, class extends St.BoxLayout {
  #theme: Theme;
  #titleBar: InstanceType<typeof TitleBar>;
  #grid: InstanceType<typeof Grid>;
  #presetButtons: ReturnType<typeof ButtonBar.new_styled>;
  #actionButtons: ReturnType<typeof ButtonBar.new_styled>;

  constructor({
    theme,
    title,
    presets,
    gridAspectRatio,
    gridSelection = null,
    ...params
  }: OverlayParams) {
    super({
      style_class: theme,
      vertical: true,
      reactive: true,
      can_focus: true,
      track_hover: true,
      ...params,
    });

    // --- initialize ---
    this.#theme = theme;
    this.#titleBar = new TitleBar({ theme, title });
    this.#grid = new Grid({
      theme,
      gridSize: presets[0],
      selection: gridSelection,
      width: TABLE_WIDTH - 2,
      height: TABLE_WIDTH / gridAspectRatio,
    });
    this.#presetButtons = ButtonBar.new_styled({
      style_class: `${theme}__preset`,
      width: TABLE_WIDTH - 20,
    });
    this.#actionButtons = ButtonBar.new_styled({
      style_class: `${theme}__action`,
      width: TABLE_WIDTH - 20,
    });

    this.presets = presets;

    // --- show  UI ---
    this.add_child(Container.new_styled({
      style_class: `${theme}__title-container`,
      child: this.#titleBar,
    }));
    this.add_child(Container.new_styled({
      style_class: `${theme}__tile-container`,
      child: this.#grid
    }));
    this.add_child(Container.new_styled({
      style_class: `${theme}__preset-container`,
      child: this.#presetButtons
    }));
    this.add_child(Container.new_styled({
      style_class: `${theme}__action-container`,
      child: this.#actionButtons
    }));

    // --- event handlers ---
    this.#titleBar.connect('closed', () => { this.visible = false; })
    this.#grid.connect("notify::grid-size", () => this.notify("grid-size"));
    this.#grid.connect("notify::selection", () => this.notify("grid-selection"));
    this.#grid.connect("selected", () => this.emit("selected"));
  }

  /**
   * Overlay title displayed next to the close button.
   */
  set title(title: string) {
    this.#titleBar.title = title;
  }

  get title() {
    return this.#titleBar.title;
  }

  /**
   * Dimensions of the grid. When set, any ongoing selection (if any) is reset.
   */
  set gridSize(gridSize: GridSize) {
    this.#grid.gridSize = gridSize;
  }

  get gridSize() {
    return this.#grid.gridSize;
  }

  /**
   * Area of highlighted tiles in the grid.
   */
  set gridSelection(gridSelection: GridSelection | null) {
    this.#grid.selection = gridSelection;
  }

  get gridSelection() {
    return this.#grid.selection;
  }

  /**
   * The available grid size presets.
   *
   * An update of presets will
   *   - reset the grid selection, if any
   *   - reset the grid size to the first preset in the list, unless the list
   *     contains a preset that matches the currently selected grid size
   */
  set presets(presets: GridSize[]) {
    this.#presetButtons.removeButtons();

    for (const preset of presets) {
      const isPresetActive = false;
      const button = TextButton.new_themed({
        theme: this.#theme,
        active: isPresetActive,
        label: `${preset.cols}x${preset.rows}`,
      });

      this.#presetButtons.addButton(button);
      button.connect('clicked', () => { this.#grid.gridSize = preset; });
    }
  }

  /**
   * Adds a new element to the action button bar.
   *
   * @param button The button to be added.
   */
  addActionButton(button: St.Button) {
    this.#actionButtons.addButton(button);
  }
});
