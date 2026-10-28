import { assembly } from "@tscircuit/core"

export const explosionAssembly = (
  <assembly.device name="case">
    <assembly.part
      name="base"
      cadModel={{ jscad: { type: "cube", size: 12 } }}
    />
    <assembly.subassembly name="cover">
      <assembly.part
        name="lid"
        cadModel={{
          jscad: { type: "cube", size: 8 },
          positionOffset: { x: 0, y: 0, z: 9 },
        }}
      />
      <assembly.part
        name="cap"
        cadModel={{
          jscad: { type: "cube", size: 3 },
          positionOffset: { x: 0, y: 0, z: 15 },
        }}
      />
    </assembly.subassembly>
    <assembly.explosion.stage name="lift">
      <assembly.explosion.move targetRef="cover" offZ="15mm" />
    </assembly.explosion.stage>
    <assembly.explosion.stage name="slide" prevStageRef="lift">
      <assembly.explosion.move
        targetRefs={["cover.lid", "cover.cap"]}
        offX="20mm"
      />
    </assembly.explosion.stage>
    <assembly.explosion.stage name="remove-cap" prevStageRef="slide">
      <assembly.explosion.move targetRef="cover.cap" offZ="10mm" />
    </assembly.explosion.stage>
  </assembly.device>
)
