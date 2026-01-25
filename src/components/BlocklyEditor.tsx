import { useEffect, useRef } from 'react';
import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';
import 'blockly/blocks'; // Import tous les blocs standards
import 'blockly/python'; // Import le générateur Python complet avec tous les blocs
import './BlocklyEditor.css';

interface BlocklyEditorProps {
  initialXml?: string;
  onCodeChange?: (code: string, xml: string) => void;
}

// Définition des blocs personnalisés pour Marty
const defineMartyBlocks = () => {
  // Bloc pour marty.walk()
  Blockly.Blocks['marty_walk'] = {
    init: function () {
      this.appendValueInput('STEPS')
        .setCheck('Number')
        .appendField('marty.walk');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip('Make Marty walk a certain number of steps');
      this.setHelpUrl('');
    },
  };

  pythonGenerator.forBlock['marty_walk'] = function (block, generator) {
    const steps = generator.valueToCode(block, 'STEPS', 0) || '2';
    const code = `marty.walk(${steps})\n`;
    return code;
  };

  // Bloc pour marty.turnRight()
  Blockly.Blocks['marty_turn'] = {
    init: function () {
      this.appendValueInput('ANGLE')
        .setCheck('Number')
        .appendField('marty.turnRight');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip('Make Marty turn right by a certain angle in degrees');
      this.setHelpUrl('');
    },
  };

  pythonGenerator.forBlock['marty_turn'] = function (block, generator) {
    const angle = generator.valueToCode(block, 'ANGLE', 0) || '30';
    const code = `marty.turnRight(${angle})\n`;
    return code;
  };

  // Bloc pour marty.turnLeft()
  Blockly.Blocks['marty_turn_left'] = {
    init: function () {
      this.appendValueInput('ANGLE')
        .setCheck('Number')
        .appendField('marty.turnLeft');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip('Make Marty turn left by a certain angle in degrees');
      this.setHelpUrl('');
    },
  };

  pythonGenerator.forBlock['marty_turn_left'] = function (block, generator) {
    const angle = generator.valueToCode(block, 'ANGLE', 0) || '30';
    const code = `marty.turnLeft(${angle})\n`;
    return code;
  };

  // Bloc pour marty.wave()
  Blockly.Blocks['marty_wave'] = {
    init: function () {
      this.appendDummyInput().appendField('marty.wave');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip('Make Marty wave');
      this.setHelpUrl('');
    },
  };

  pythonGenerator.forBlock['marty_wave'] = function () {
    return 'marty.wave()\n';
  };

  // Bloc pour marty.kick()
  Blockly.Blocks['marty_kick'] = {
    init: function () {
      this.appendDummyInput().appendField('marty.kick');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip('Make Marty kick');
      this.setHelpUrl('');
    },
  };

  pythonGenerator.forBlock['marty_kick'] = function () {
    return 'marty.kick()\n';
  };

  // Bloc pour marty.dance()
  Blockly.Blocks['marty_dance'] = {
    init: function () {
      this.appendDummyInput().appendField('marty.dance');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip('Make Marty dance');
      this.setHelpUrl('');
    },
  };

  pythonGenerator.forBlock['marty_dance'] = function () {
    return 'marty.dance()\n';
  };

  // Bloc pour marty.slideLeft()
  Blockly.Blocks['marty_slide_left'] = {
    init: function () {
      this.appendDummyInput().appendField('marty.slideLeft');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip('Make Marty slide to the left');
      this.setHelpUrl('');
    },
  };

  pythonGenerator.forBlock['marty_slide_left'] = function () {
    return 'marty.slideLeft()\n';
  };

  // Bloc pour marty.slideRight()
  Blockly.Blocks['marty_slide_right'] = {
    init: function () {
      this.appendDummyInput().appendField('marty.slideRight');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip('Make Marty slide to the right');
      this.setHelpUrl('');
    },
  };

  pythonGenerator.forBlock['marty_slide_right'] = function () {
    return 'marty.slideRight()\n';
  };

  // Bloc pour marty.stop()
  Blockly.Blocks['marty_stop'] = {
    init: function () {
      this.appendDummyInput().appendField('marty.stop');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip('Stop all Marty movements');
      this.setHelpUrl('');
    },
  };

  pythonGenerator.forBlock['marty_stop'] = function () {
    return 'marty.stop()\n';
  };
};

export const BlocklyEditor = ({
  initialXml,
  onCodeChange,
}: BlocklyEditorProps) => {
  const blocklyDiv = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!blocklyDiv.current) return;

    // Définir les blocs personnalisés
    defineMartyBlocks();

    // Configuration de la toolbox
    const toolbox = {
      kind: 'categoryToolbox',
      contents: [
        {
          kind: 'category',
          name: 'Marty',
          colour: 160,
          contents: [
            {
              kind: 'block',
              type: 'marty_walk',
              inputs: {
                STEPS: {
                  shadow: {
                    type: 'math_number',
                    fields: {
                      NUM: 2,
                    },
                  },
                },
              },
            },
            {
              kind: 'block',
              type: 'marty_turn',
              inputs: {
                ANGLE: {
                  shadow: {
                    type: 'math_number',
                    fields: {
                      NUM: 30,
                    },
                  },
                },
              },
            },
            {
              kind: 'block',
              type: 'marty_turn_left',
              inputs: {
                ANGLE: {
                  shadow: {
                    type: 'math_number',
                    fields: {
                      NUM: 30,
                    },
                  },
                },
              },
            },
            {
              kind: 'block',
              type: 'marty_wave',
            },
            {
              kind: 'block',
              type: 'marty_kick',
            },
            {
              kind: 'block',
              type: 'marty_dance',
            },
            {
              kind: 'block',
              type: 'marty_slide_left',
            },
            {
              kind: 'block',
              type: 'marty_slide_right',
            },
            {
              kind: 'block',
              type: 'marty_stop',
            },
          ],
        },
        {
          kind: 'category',
          name: 'Logic',
          colour: 210,
          contents: [
            {
              kind: 'block',
              type: 'controls_if',
            },
            {
              kind: 'block',
              type: 'logic_compare',
            },
            {
              kind: 'block',
              type: 'logic_operation',
            },
            {
              kind: 'block',
              type: 'logic_negate',
            },
            {
              kind: 'block',
              type: 'logic_boolean',
            },
          ],
        },
        {
          kind: 'category',
          name: 'Loops',
          colour: 120,
          contents: [
            {
              kind: 'block',
              type: 'controls_repeat_ext',
              inputs: {
                TIMES: {
                  shadow: {
                    type: 'math_number',
                    fields: {
                      NUM: 10,
                    },
                  },
                },
              },
            },
            {
              kind: 'block',
              type: 'controls_whileUntil',
            },
            {
              kind: 'block',
              type: 'controls_for',
              inputs: {
                FROM: {
                  shadow: {
                    type: 'math_number',
                    fields: {
                      NUM: 1,
                    },
                  },
                },
                TO: {
                  shadow: {
                    type: 'math_number',
                    fields: {
                      NUM: 10,
                    },
                  },
                },
                BY: {
                  shadow: {
                    type: 'math_number',
                    fields: {
                      NUM: 1,
                    },
                  },
                },
              },
            },
          ],
        },
        {
          kind: 'category',
          name: 'Math',
          colour: 230,
          contents: [
            {
              kind: 'block',
              type: 'math_number',
              fields: {
                NUM: 0,
              },
            },
            {
              kind: 'block',
              type: 'math_arithmetic',
              inputs: {
                A: {
                  shadow: {
                    type: 'math_number',
                    fields: {
                      NUM: 1,
                    },
                  },
                },
                B: {
                  shadow: {
                    type: 'math_number',
                    fields: {
                      NUM: 1,
                    },
                  },
                },
              },
            },
            {
              kind: 'block',
              type: 'math_single',
              inputs: {
                NUM: {
                  shadow: {
                    type: 'math_number',
                    fields: {
                      NUM: 9,
                    },
                  },
                },
              },
            },
          ],
        },
        {
          kind: 'category',
          name: 'Variables',
          colour: 330,
          custom: 'VARIABLE',
        },
      ],
    };

    // Créer le workspace Blockly
    const workspace = Blockly.inject(blocklyDiv.current, {
      toolbox: toolbox,
      grid: {
        spacing: 20,
        length: 3,
        colour: '#ccc',
        snap: true,
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 1.0,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2,
      },
      trashcan: true,
    });

    workspaceRef.current = workspace;

    // Charger l'XML initial si fourni
    if (initialXml) {
      try {
        const xml = Blockly.utils.xml.textToDom(initialXml);
        Blockly.Xml.domToWorkspace(xml, workspace);
      } catch (e) {
        // Silently ignore
      }
    }

    // Écouter les changements du workspace
    const handleWorkspaceChange = () => {
      const code = pythonGenerator.workspaceToCode(workspace);
      const xml = Blockly.Xml.workspaceToDom(workspace);
      const xmlText = Blockly.Xml.domToText(xml);

      if (onCodeChange) {
        onCodeChange(code, xmlText);
      }
    };

    workspace.addChangeListener(handleWorkspaceChange);

    // Générer le code initial
    handleWorkspaceChange();

    // Setup ResizeObserver to resize Blockly when container size changes
    if (blocklyDiv.current) {
      resizeObserverRef.current = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          Blockly.svgResize(workspace);
        });
      });
      resizeObserverRef.current.observe(blocklyDiv.current);
    }

    // Cleanup
    return () => {
      try {
        if (workspace) {
          workspace.dispose();
        }
        workspaceRef.current = null;
      } catch (error) {
        // Silently ignore
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!workspaceRef.current || !initialXml) return;

    try {
      const currentDom = Blockly.Xml.workspaceToDom(workspaceRef.current);
      const currentXmlText = Blockly.Xml.domToText(currentDom);
      if (currentXmlText === initialXml) {
        return;
      }
    } catch (error) {
      return;
    }

    try {
      // Clear workspace safely
      const blocks = workspaceRef.current.getTopBlocks(false);
      blocks.forEach(block => {
        try {
          block.dispose(false);
        } catch (e) {
          // Silently ignore
        }
      });
      
      // Load new XML
      const xml = Blockly.utils.xml.textToDom(initialXml);
      Blockly.Xml.domToWorkspace(xml, workspaceRef.current);
    } catch (error) {
      // Silently ignore
    }
  }, [initialXml]);

  return (
    <div
      ref={blocklyDiv}
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  );
};
