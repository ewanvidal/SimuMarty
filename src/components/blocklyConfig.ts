// Configuration initiale de Blockly avec un exemple de programme
export const BLOCKLY_INITIAL_WORKSPACE = `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="controls_repeat_ext" x="20" y="20">
    <value name="TIMES">
      <shadow type="math_number">
        <field name="NUM">3</field>
      </shadow>
    </value>
    <statement name="DO">
      <block type="marty_walk">
        <value name="STEPS">
          <shadow type="math_number">
            <field name="NUM">2</field>
          </shadow>
        </value>
        <next>
          <block type="marty_wave"></block>
        </next>
      </block>
    </statement>
  </block>
</xml>
`;
