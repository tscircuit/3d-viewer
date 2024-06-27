## Source

### `source_component_base`

```json
{
  "type": "source_component",
  "ftype": "consectetur",
  "source_component_id": "source_component_1",
  "name": "C1",
  "supplier_part_numbers": {
    "voluptate_b5": ["cillum ad qui aute"],
    "dolor__": [
      "Excepteur Lorem",
      "voluptate minim ut ea",
      "Excepteur veniam esse officia sit",
      "ut ipsum voluptate"
    ],
    "qui_1": [
      "do eu",
      "sint incididunt aute labore",
      "pariatur labore",
      "labore"
    ]
  }
}
```

| Property              | Type   | Required | Description |
| --------------------- | ------ | -------- | ----------- |
| type                  | string | Yes      |             |
| ftype                 | string | No       |             |
| source_component_id   | string | Yes      |             |
| name                  | string | Yes      |             |
| supplier_part_numbers | object | No       |             |

### `source_group`

```json
{
  "type": "source_group",
  "source_group_id": "source_group_1",
  "name": "G1"
}
```

| Property        | Type   | Required | Description |
| --------------- | ------ | -------- | ----------- |
| type            | string | Yes      |             |
| source_group_id | string | Yes      |             |
| name            | string | No       |             |

### `source_led`

```json
{
  "type": "source_component",
  "ftype": "led",
  "source_component_id": "source_component_1",
  "name": "L1",
  "supplier_part_numbers": {
    "pariaturcd9": ["amet est do nostrud"],
    "culpa_ce": ["dolore reprehenderit ex Excepteur do", "ipsum in nulla anim"],
    "exercitationc_6": [
      "elit reprehenderit laborum laboris",
      "non aliquip",
      "minim",
      "reprehenderit sint occaecat pariatur",
      "exercitation ea"
    ]
  }
}
```

| Property              | Type   | Required | Description |
| --------------------- | ------ | -------- | ----------- |
| type                  | string | Yes      |             |
| ftype                 | string | Yes      |             |
| source_component_id   | string | Yes      |             |
| name                  | string | Yes      |             |
| supplier_part_numbers | object | No       |             |

### `source_net`

```json
{
  "type": "source_net",
  "source_net_id": "source_net_1",
  "name": "N1",
  "member_source_group_ids": [
    "laborum minim",
    "Duis culpa et esse",
    "aliquip labore"
  ],
  "is_power": true,
  "is_ground": false,
  "is_digital_signal": true,
  "is_analog_signal": true
}
```

| Property                | Type    | Required | Description |
| ----------------------- | ------- | -------- | ----------- |
| type                    | string  | Yes      |             |
| source_net_id           | string  | Yes      |             |
| name                    | string  | Yes      |             |
| member_source_group_ids | array   | Yes      |             |
| is_power                | boolean | No       |             |
| is_ground               | boolean | No       |             |
| is_digital_signal       | boolean | No       |             |
| is_analog_signal        | boolean | No       |             |

### `source_port`

```json
{
  "type": "source_port",
  "pin_number": 54740263.182806104,
  "port_hints": ["1", "left"],
  "name": "P1",
  "source_port_id": "source_port_1",
  "source_component_id": "source_component_1"
}
```

| Property            | Type   | Required | Description |
| ------------------- | ------ | -------- | ----------- |
| type                | string | Yes      |             |
| pin_number          | number | No       |             |
| port_hints          | array  | No       |             |
| name                | string | Yes      |             |
| source_port_id      | string | Yes      |             |
| source_component_id | string | Yes      |             |

### `source_simple_bug`

```json
{
  "type": "source_component",
  "ftype": "simple_bug",
  "source_component_id": "source_component_1",
  "name": "B1",
  "supplier_part_numbers": {
    "elit_21": ["amet nostrud officia Lorem Excepteur", "amet"]
  }
}
```

| Property              | Type   | Required | Description |
| --------------------- | ------ | -------- | ----------- |
| type                  | string | Yes      |             |
| ftype                 | string | Yes      |             |
| source_component_id   | string | Yes      |             |
| name                  | string | Yes      |             |
| supplier_part_numbers | object | No       |             |

### `source_simple_capacitor`

```json
{
  "type": "source_component",
  "ftype": "simple_capacitor",
  "source_component_id": "source_component_1",
  "name": "C1",
  "capacitance": "1uF"
}
```

| Property              | Type           | Required | Description |
| --------------------- | -------------- | -------- | ----------- |
| type                  | string         | Yes      |             |
| ftype                 | string         | Yes      |             |
| source_component_id   | string         | Yes      |             |
| name                  | string         | Yes      |             |
| supplier_part_numbers | object         | No       |             |
| capacitance           | string, number | Yes      |             |

### `source_simple_diode`

```json
{
  "type": "source_component",
  "ftype": "simple_diode",
  "source_component_id": "source_component_1",
  "name": "D1",
  "supplier_part_numbers": {
    "Ut9": [
      "pariatur quis magna non",
      "ut ut",
      "dolor aliquip reprehenderit deserunt enim"
    ],
    "adipisicing2": [
      "aliquip exercitation veniam",
      "Ut exercitation ullamco nulla ex"
    ]
  }
}
```

| Property              | Type   | Required | Description |
| --------------------- | ------ | -------- | ----------- |
| type                  | string | Yes      |             |
| ftype                 | string | Yes      |             |
| source_component_id   | string | Yes      |             |
| name                  | string | Yes      |             |
| supplier_part_numbers | object | No       |             |

### `source_simple_ground`

```json
{
  "type": "source_component",
  "ftype": "simple_ground",
  "source_component_id": "source_component_1",
  "name": "G1",
  "supplier_part_numbers": {
    "quis69": [
      "elit et sit culpa",
      "dolor amet consequat reprehenderit dolore",
      "Duis deserunt"
    ],
    "adipisicing_5c": [
      "cillum pariatur deserunt aute est",
      "aliqua sit ipsum est quis",
      "deserunt sit cupidatat"
    ],
    "eu_41": [
      "ex ipsum incididunt esse in",
      "aliquip nostrud esse",
      "incididunt",
      "esse est ipsum aute",
      "ut dolore fugiat in anim"
    ]
  }
}
```

| Property              | Type   | Required | Description |
| --------------------- | ------ | -------- | ----------- |
| type                  | string | Yes      |             |
| ftype                 | string | Yes      |             |
| source_component_id   | string | Yes      |             |
| name                  | string | Yes      |             |
| supplier_part_numbers | object | No       |             |

### `source_simple_power_source`

```json
{
  "type": "source_component",
  "ftype": "simple_power_source",
  "source_component_id": "source_component_1",
  "name": "P1",
  "supplier_part_numbers": {
    "irure5": ["dolore Ut Excepteur adipisicing"],
    "irure6f2": ["proident", "id sit qui laboris in", "dolor", "ex"],
    "non_9": [
      "esse",
      "reprehenderit occaecat",
      "cupidatat proident consectetur do sed"
    ],
    "Excepteur__": ["ea in pariatur", "ex"]
  },
  "voltage": "5V"
}
```

| Property              | Type           | Required | Description |
| --------------------- | -------------- | -------- | ----------- |
| type                  | string         | Yes      |             |
| ftype                 | string         | Yes      |             |
| source_component_id   | string         | Yes      |             |
| name                  | string         | Yes      |             |
| supplier_part_numbers | object         | No       |             |
| voltage               | string, number | Yes      |             |

### `source_simple_resistor`

```json
{
  "type": "source_component",
  "ftype": "simple_resistor",
  "source_component_id": "source_component_1",
  "name": "R1",
  "supplier_part_numbers": {
    "velit53": ["esse eu consequat"]
  },
  "resistance": "1k"
}
```

| Property              | Type           | Required | Description |
| --------------------- | -------------- | -------- | ----------- |
| type                  | string         | Yes      |             |
| ftype                 | string         | Yes      |             |
| source_component_id   | string         | Yes      |             |
| name                  | string         | Yes      |             |
| supplier_part_numbers | object         | No       |             |
| resistance            | string, number | Yes      |             |

### `source_trace`

```json
{
  "type": "source_trace",
  "source_trace_id": "source_trace_1",
  "connected_source_port_ids": [
    "incididunt ad dolore qui",
    "elit pariatur dolor est labore"
  ],
  "connected_source_net_ids": [
    "tempor eiusmod do laboris id",
    "ipsum ut ad",
    "cillum eiusmod pariatur enim",
    "proident"
  ]
}
```

| Property                  | Type   | Required | Description |
| ------------------------- | ------ | -------- | ----------- |
| type                      | string | Yes      |             |
| source_trace_id           | string | Yes      |             |
| connected_source_port_ids | array  | Yes      |             |
| connected_source_net_ids  | array  | Yes      |             |

## Schematic

### `schematic_box`

Draws a box on the schematic

```json
{
  "type": "schematic_box",
  "schematic_component_id": "schematic_component_1",
  "width": "5mm",
  "height": "5mm",
  "x": "3mm",
  "y": "1mm"
}
```

| Property               | Type           | Required | Description |
| ---------------------- | -------------- | -------- | ----------- |
| type                   | string         | Yes      |             |
| schematic_component_id | string         | Yes      |             |
| width                  | string, number | Yes      |             |
| height                 | string, number | Yes      |             |
| x                      | string, number | Yes      |             |
| y                      | string, number | Yes      |             |

### `schematic_component`

```json
{
  "type": "schematic_component",
  "rotation": "90deg",
  "size": {
    "width": "5mm",
    "height": "5mm"
  },
  "center": {
    "x": "3mm",
    "y": "1mm"
  },
  "source_component_id": "source_component_1",
  "schematic_component_id": "schematic_component_1",
  "pin_spacing": -24166877.58031033,
  "box_width": -67498217.8392372,
  "port_arrangement": {
    "left_size": 3,
    "right_size": 3
  },
  "port_labels": {
    "1": "VCC",
    "2": "GND",
    "3": "OUT"
  }
}
```

| Property               | Type           | Required | Description |
| ---------------------- | -------------- | -------- | ----------- |
| type                   | string         | Yes      |             |
| rotation               | string, number | No       |             |
| size                   | object         | Yes      |             |
| center                 | object         | Yes      |             |
| source_component_id    | string         | Yes      |             |
| schematic_component_id | string         | Yes      |             |
| pin_spacing            | undefined      | No       |             |
| box_width              | undefined      | No       |             |
| port_arrangement       | undefined      | No       |             |
| port_labels            | object         | No       |             |

### `schematic_error`

Defines a schematic error on the schematic

```json
{
  "schematic_error_id": "schematic_error_1",
  "type": "schematic_error",
  "error_type": "schematic_port_not_found",
  "message": "consectetur eiusmod dolor in do"
}
```

| Property           | Type   | Required | Description |
| ------------------ | ------ | -------- | ----------- |
| schematic_error_id | string | Yes      |             |
| type               | string | Yes      |             |
| error_type         | string | Yes      |             |
| message            | string | Yes      |             |

### `schematic_line`

```json
{
  "type": "schematic_line",
  "schematic_component_id": "schematic_component_1",
  "x1": "1mm",
  "x2": "2mm",
  "y1": "1mm",
  "y2": "2mm"
}
```

| Property               | Type           | Required | Description |
| ---------------------- | -------------- | -------- | ----------- |
| type                   | string         | Yes      |             |
| schematic_component_id | string         | Yes      |             |
| x1                     | string, number | Yes      |             |
| x2                     | string, number | Yes      |             |
| y1                     | string, number | Yes      |             |
| y2                     | string, number | Yes      |             |

### `schematic_net_label`

```json
{
  "type": "schematic_net_label",
  "source_net_id": "source_net_1",
  "center": {
    "x": "3mm",
    "y": "1mm"
  },
  "anchor_side": "right",
  "text": "Hello, World!"
}
```

| Property      | Type   | Required | Description |
| ------------- | ------ | -------- | ----------- |
| type          | string | Yes      |             |
| source_net_id | string | Yes      |             |
| center        | object | Yes      |             |
| anchor_side   | string | Yes      |             |
| text          | string | Yes      |             |

### `schematic_path`

```json
{
  "type": "schematic_path",
  "schematic_component_id": "schematic_component_1",
  "fill_color": "red",
  "is_filled": true,
  "points": [
    {
      "x": "3mm",
      "y": "1mm"
    },
    {
      "x": "3mm",
      "y": "1mm"
    },
    {
      "x": "3mm",
      "y": "1mm"
    },
    {
      "x": "3mm",
      "y": "1mm"
    }
  ]
}
```

| Property               | Type    | Required | Description |
| ---------------------- | ------- | -------- | ----------- |
| type                   | string  | Yes      |             |
| schematic_component_id | string  | Yes      |             |
| fill_color             | string  | No       |             |
| is_filled              | boolean | No       |             |
| points                 | array   | Yes      |             |

### `schematic_port`

Defines a port on a schematic component

```json
{
  "type": "schematic_port",
  "schematic_port_id": "schematic_port_1",
  "source_port_id": "source_port_1",
  "schematic_component_id": "schematic_component_1",
  "center": {
    "x": "3mm",
    "y": "1mm"
  },
  "facing_direction": "down"
}
```

| Property               | Type   | Required | Description |
| ---------------------- | ------ | -------- | ----------- |
| type                   | string | Yes      |             |
| schematic_port_id      | string | Yes      |             |
| source_port_id         | string | Yes      |             |
| schematic_component_id | string | No       |             |
| center                 | object | Yes      |             |
| facing_direction       | string | No       |             |

### `schematic_text`

```json
{
  "type": "schematic_text",
  "schematic_component_id": "schematic_component_1",
  "schematic_text_id": "schematic_text_1",
  "text": "Hello, World!",
  "position": {
    "x": "3mm",
    "y": "1mm"
  },
  "rotation": "90deg",
  "anchor": "center"
}
```

| Property               | Type   | Required | Description |
| ---------------------- | ------ | -------- | ----------- |
| type                   | string | Yes      |             |
| schematic_component_id | string | Yes      |             |
| schematic_text_id      | string | Yes      |             |
| text                   | string | Yes      |             |
| position               | object | Yes      |             |
| rotation               | number | No       |             |
| anchor                 | string | No       |             |

### `schematic_trace`

```json
{
  "type": "schematic_trace",
  "schematic_trace_id": "schematic_trace_1",
  "source_trace_id": "source_trace_1",
  "edges": [
    {
      "from": {
        "x": "3mm",
        "y": "1mm"
      },
      "to": {
        "x": "3mm",
        "y": "1mm"
      },
      "to_schematic_port_id": "to_schematic_port_1"
    }
  ]
}
```

| Property           | Type   | Required | Description |
| ------------------ | ------ | -------- | ----------- |
| type               | string | Yes      |             |
| schematic_trace_id | string | Yes      |             |
| source_trace_id    | string | Yes      |             |
| edges              | array  | Yes      |             |

## Pcb

### `pcb_board`

Defines the board outline of the PCB

```json
{
  "type": "pcb_board",
  "width": "5mm",
  "height": "5mm",
  "center": {
    "x": "3mm",
    "y": "1mm"
  }
}
```

| Property | Type           | Required | Description |
| -------- | -------------- | -------- | ----------- |
| type     | string         | Yes      |             |
| width    | string, number | Yes      |             |
| height   | string, number | Yes      |             |
| center   | object         | Yes      |             |

### `pcb_component`

Defines a component on the PCB

```json
{
  "type": "pcb_component",
  "pcb_component_id": "pcb_component_1",
  "source_component_id": "source_component_1",
  "center": {
    "x": "3mm",
    "y": "1mm"
  },
  "layer": "top",
  "rotation": "90deg",
  "width": "5mm",
  "height": "5mm"
}
```

| Property            | Type           | Required | Description |
| ------------------- | -------------- | -------- | ----------- |
| type                | string         | Yes      |             |
| pcb_component_id    | string         | Yes      |             |
| source_component_id | string         | Yes      |             |
| center              | object         | Yes      |             |
| layer               | undefined      | Yes      |             |
| rotation            | string, number | Yes      |             |
| width               | undefined      | Yes      |             |
| height              | undefined      | Yes      |             |

### `pcb_fabrication_note_path`

Defines a fabrication path on the PCB for fabricators or assemblers

```json
{
  "type": "pcb_fabrication_note_path",
  "fabrication_note_path_id": "fabrication_note_path_1",
  "pcb_component_id": "pcb_component_1",
  "layer": "top",
  "route": [
    {
      "x": "3mm",
      "y": "1mm"
    },
    {
      "x": "3mm",
      "y": "1mm"
    }
  ],
  "stroke_width": "0.1mm"
}
```

| Property                 | Type      | Required | Description |
| ------------------------ | --------- | -------- | ----------- |
| type                     | string    | Yes      |             |
| fabrication_note_path_id | string    | Yes      |             |
| pcb_component_id         | string    | Yes      |             |
| layer                    | string    | Yes      |             |
| route                    | array     | Yes      |             |
| stroke_width             | undefined | Yes      |             |

### `pcb_fabrication_note_text`

Defines a fabrication note in text on the PCB, useful for leaving notes for assemblers or fabricators

```json
{
  "type": "pcb_fabrication_note_text",
  "pcb_component_id": "pcb_component_1",
  "text": "Hello, World!",
  "layer": "top"
}
```

| Property         | Type           | Required | Description |
| ---------------- | -------------- | -------- | ----------- |
| type             | string         | Yes      |             |
| font             | string         | No       |             |
| font_size        | string, number | No       |             |
| pcb_component_id | string         | Yes      |             |
| text             | string         | Yes      |             |
| layer            | string         | Yes      |             |
| anchor_position  | object         | No       |             |
| anchor_alignment | string         | No       |             |

### `pcb_placement_error`

Defines a placement error on the PCB

```json
{
  "pcb_error_id": "pcb_error_1",
  "type": "pcb_error",
  "error_type": "pcb_placement_error",
  "message": "nisi incididunt sint"
}
```

| Property     | Type   | Required | Description |
| ------------ | ------ | -------- | ----------- |
| pcb_error_id | string | Yes      |             |
| type         | string | Yes      |             |
| error_type   | string | Yes      |             |
| message      | string | Yes      |             |

### `pcb_port`

Defines a port on the PCB

```json
{
  "type": "pcb_port",
  "pcb_port_id": "pcb_port_1",
  "source_port_id": "source_port_1",
  "pcb_component_id": "pcb_component_1",
  "x": "3mm",
  "y": "1mm",
  "layers": ["top", "bottom"]
}
```

| Property         | Type           | Required | Description |
| ---------------- | -------------- | -------- | ----------- |
| type             | string         | Yes      |             |
| pcb_port_id      | string         | Yes      |             |
| source_port_id   | string         | Yes      |             |
| pcb_component_id | string         | Yes      |             |
| x                | string, number | Yes      |             |
| y                | string, number | Yes      |             |
| layers           | array          | Yes      |             |

### `pcb_port_not_matched_error`

Defines a trace error on the PCB

```json
{
  "pcb_error_id": "pcb_error_1",
  "type": "pcb_error",
  "error_type": "pcb_port_not_matched_error",
  "message": "aliqua dolor ea",
  "pcb_component_ids": ["pcb_component_1"]
}
```

| Property          | Type   | Required | Description |
| ----------------- | ------ | -------- | ----------- |
| pcb_error_id      | string | Yes      |             |
| type              | string | Yes      |             |
| error_type        | string | Yes      |             |
| message           | string | Yes      |             |
| pcb_component_ids | array  | Yes      |             |

### `pcb_silkscreen_circle`

Defines a silkscreen circle on the PCB

```json
{
  "type": "pcb_silkscreen_circle",
  "pcb_silkscreen_circle_id": "pcb_silkscreen_circle_1",
  "pcb_component_id": "pcb_component_1",
  "center": {
    "x": "3mm",
    "y": "1mm"
  },
  "radius": "5mm",
  "layer": "top"
}
```

| Property                 | Type      | Required | Description |
| ------------------------ | --------- | -------- | ----------- |
| type                     | string    | Yes      |             |
| pcb_silkscreen_circle_id | string    | Yes      |             |
| pcb_component_id         | string    | Yes      |             |
| center                   | object    | Yes      |             |
| radius                   | undefined | Yes      |             |
| layer                    | string    | Yes      |             |

### `pcb_silkscreen_line`

Defines a silkscreen line on the PCB

```json
{
  "type": "pcb_silkscreen_line",
  "pcb_silkscreen_line_id": "pcb_silkscreen_line_1",
  "pcb_component_id": "pcb_component_1",
  "stroke_width": "0.1mm",
  "x1": "1mm",
  "y1": "1mm",
  "x2": "2mm",
  "y2": "2mm",
  "layer": "top"
}
```

| Property               | Type           | Required | Description |
| ---------------------- | -------------- | -------- | ----------- |
| type                   | string         | Yes      |             |
| pcb_silkscreen_line_id | string         | Yes      |             |
| pcb_component_id       | string         | Yes      |             |
| stroke_width           | string, number | No       |             |
| x1                     | string, number | Yes      |             |
| y1                     | string, number | Yes      |             |
| x2                     | string, number | Yes      |             |
| y2                     | string, number | Yes      |             |
| layer                  | string         | Yes      |             |

### `pcb_silkscreen_path`

Defines a silkscreen path on the PCB

```json
{
  "type": "pcb_silkscreen_path",
  "pcb_silkscreen_path_id": "pcb_silkscreen_path_1",
  "pcb_component_id": "pcb_component_1",
  "layer": "top",
  "route": [
    {
      "x": "3mm",
      "y": "1mm"
    },
    {
      "x": "3mm",
      "y": "1mm"
    }
  ],
  "stroke_width": "0.1mm"
}
```

| Property               | Type      | Required | Description |
| ---------------------- | --------- | -------- | ----------- |
| type                   | string    | Yes      |             |
| pcb_silkscreen_path_id | string    | Yes      |             |
| pcb_component_id       | string    | Yes      |             |
| layer                  | string    | Yes      |             |
| route                  | array     | Yes      |             |
| stroke_width           | undefined | Yes      |             |

### `pcb_silkscreen_rect`

Defines a silkscreen rect on the PCB

```json
{
  "type": "pcb_silkscreen_rect",
  "pcb_silkscreen_rect_id": "pcb_silkscreen_rect_1",
  "pcb_component_id": "pcb_component_1",
  "center": {
    "x": "3mm",
    "y": "1mm"
  },
  "width": "5mm",
  "height": "5mm",
  "layer": "top"
}
```

| Property               | Type      | Required | Description |
| ---------------------- | --------- | -------- | ----------- |
| type                   | string    | Yes      |             |
| pcb_silkscreen_rect_id | string    | Yes      |             |
| pcb_component_id       | string    | Yes      |             |
| center                 | object    | Yes      |             |
| width                  | undefined | Yes      |             |
| height                 | undefined | Yes      |             |
| layer                  | string    | Yes      |             |

### `pcb_silkscreen_text`

Defines silkscreen text on the PCB

```json
{
  "type": "pcb_silkscreen_text",
  "font": "tscircuit2024",
  "font_size": "1mm",
  "pcb_component_id": "pcb_component_1",
  "text": "Hello, World!",
  "layer": "top",
  "anchor_position": {
    "x": "3mm",
    "y": "1mm"
  }
}
```

| Property         | Type           | Required | Description |
| ---------------- | -------------- | -------- | ----------- |
| type             | string         | Yes      |             |
| font             | string         | No       |             |
| font_size        | string, number | No       |             |
| pcb_component_id | string         | Yes      |             |
| text             | string         | Yes      |             |
| layer            | string         | Yes      |             |
| anchor_position  | object         | No       |             |
| anchor_alignment | string         | No       |             |

### `pcb_text`

Defines text on the PCB

```json
{
  "type": "pcb_text",
  "text": "Hello, World!",
  "x": "3mm",
  "y": "1mm",
  "align": "bottom-left",
  "width": "5mm",
  "height": "5mm",
  "lines": 1
}
```

| Property | Type           | Required | Description |
| -------- | -------------- | -------- | ----------- |
| type     | string         | Yes      |             |
| text     | string         | Yes      |             |
| x        | string, number | Yes      |             |
| y        | string, number | Yes      |             |
| align    | string         | Yes      |             |
| width    | string, number | Yes      |             |
| height   | string, number | Yes      |             |
| lines    | number         | Yes      |             |

### `pcb_trace`

```json
{
  "type": "pcb_trace",
  "source_trace_id": "source_trace_1",
  "pcb_component_id": "pcb_component_1",
  "pcb_trace_id": "pcb_trace_1",
  "route": [
    {
      "route_type": "wire",
      "x": "3mm",
      "y": "1mm",
      "width": "5mm",
      "start_pcb_port_id": "start_pcb_port_1",
      "end_pcb_port_id": "end_pcb_port_1",
      "layer": "top"
    }
  ]
}
```

| Property         | Type   | Required | Description |
| ---------------- | ------ | -------- | ----------- |
| type             | string | Yes      |             |
| source_trace_id  | string | No       |             |
| pcb_component_id | string | No       |             |
| pcb_trace_id     | string | Yes      |             |
| route            | array  | Yes      |             |

### `pcb_trace_error`

Defines a trace error on the PCB

```json
{
  "pcb_error_id": "pcb_error_1",
  "type": "pcb_error",
  "error_type": "pcb_trace_error",
  "message": "ex",
  "pcb_trace_id": "pcb_trace_1",
  "source_trace_id": "source_trace_1",
  "pcb_component_ids": ["pcb_component_1"],
  "pcb_port_ids": ["pcb_port_1", "pcb_port_2"]
}
```

| Property          | Type   | Required | Description |
| ----------------- | ------ | -------- | ----------- |
| pcb_error_id      | string | Yes      |             |
| type              | string | Yes      |             |
| error_type        | string | Yes      |             |
| message           | string | Yes      |             |
| pcb_trace_id      | string | Yes      |             |
| source_trace_id   | string | Yes      |             |
| pcb_component_ids | array  | Yes      |             |
| pcb_port_ids      | array  | Yes      |             |

### `pcb_trace_hint`

A hint that can be used to generate a PCB trace

```json
{
  "pcb_trace_hint_id": "pcb_trace_hint_1",
  "type": "pcb_trace_hint",
  "pcb_port_id": "pcb_port_1",
  "pcb_component_id": "pcb_component_1",
  "route": [
    {
      "x": "3mm",
      "y": "1mm",
      "via": true,
      "to_layer": "bottom"
    },
    {
      "x": "3mm",
      "y": "1mm",
      "via": true,
      "to_layer": "bottom"
    }
  ]
}
```

| Property          | Type   | Required | Description |
| ----------------- | ------ | -------- | ----------- |
| pcb_trace_hint_id | string | Yes      |             |
| type              | string | Yes      |             |
| pcb_port_id       | string | Yes      |             |
| pcb_component_id  | string | Yes      |             |
| route             | array  | Yes      |             |

### `pcb_via`

Defines a via on the PCB

```json
{
  "type": "pcb_via",
  "x": "3mm",
  "y": "1mm",
  "outer_diameter": "1.2mm",
  "hole_diameter": "0.08in",
  "from_layer": "top",
  "to_layer": "bottom",
  "layers": ["top", "bottom"]
}
```

| Property       | Type           | Required | Description |
| -------------- | -------------- | -------- | ----------- |
| type           | string         | Yes      |             |
| x              | string, number | Yes      |             |
| y              | string, number | Yes      |             |
| outer_diameter | string, number | No       |             |
| hole_diameter  | string, number | No       |             |
| from_layer     | undefined      | No       |             |
| to_layer       | undefined      | No       |             |
| layers         | array          | Yes      |             |

## Misc

### `any_source_component`

```json
{
  "type": "source_component",
  "ftype": "led",
  "source_component_id": "source_component_1",
  "name": "L1",
  "supplier_part_numbers": {
    "esse6e1": [
      "ex anim sint mollit",
      "dolore nulla occaecat voluptate",
      "qui eiusmod dolore consequat",
      "qui dolore"
    ],
    "aliquip_0": ["nulla ad"],
    "ullamco_466": ["Lorem", "consectetur nisi", "deserunt", "amet cillum esse"]
  }
}
```

### `capacitance`

```json
"1uF"
```

### `current`

```json
"1A"
```

### `distance`

```json
"10mm"
```

### `inductance`

```json
"1mH"
```

### `layer_ref`

```json
"top"
```

### `layer_string`

```json
"inner4"
```

### `length`

```json
"1m"
```

### `pcb_hole`

Defines a hole on the PCB

```json
{
  "type": "pcb_hole",
  "hole_diameter": "0.08in",
  "x": "3mm",
  "y": "1mm"
}
```

### `pcb_plated_hole`

Defines a plated hole on the PCB

```json
{
  "type": "pcb_plated_hole",
  "shape": "oval",
  "outer_width": -19181027.975192234,
  "outer_height": 13417151.0622572,
  "hole_width": "1mm",
  "hole_height": "1mm",
  "x": "3mm",
  "y": "1mm",
  "layers": ["top", "bottom"]
}
```

### `pcb_route_hint`

```json
{
  "x": "3mm",
  "y": "1mm",
  "via": false,
  "via_to_layer": "inner5"
}
```

| Property     | Type           | Required | Description |
| ------------ | -------------- | -------- | ----------- |
| x            | string, number | Yes      |             |
| y            | string, number | Yes      |             |
| via          | boolean        | No       |             |
| via_to_layer | undefined      | No       |             |

### `pcb_route_hints`

```json
[
  {
    "x": "5mm",
    "y": "6mm",
    "via": false
  }
]
```

### `pcb_smtpad`

Defines an SMT pad on the PCB

```json
{
  "pcb_smtpad_id": "pcb_smtpad_1",
  "type": "pcb_smtpad",
  "shape": "rect",
  "x": "3mm",
  "y": "1mm",
  "width": "5mm",
  "height": "5mm",
  "layer": "top",
  "port_hints": ["1", "left"],
  "pcb_component_id": "pcb_component_1",
  "pcb_port_id": "pcb_port_1"
}
```

### `point`

```json
{
  "x": "3mm",
  "y": "1mm"
}
```

| Property | Type           | Required | Description |
| -------- | -------------- | -------- | ----------- |
| x        | string, number | Yes      |             |
| y        | string, number | Yes      |             |

### `position`

```json
{
  "x": "3mm",
  "y": "1mm"
}
```

| Property | Type           | Required | Description |
| -------- | -------------- | -------- | ----------- |
| x        | string, number | Yes      |             |
| y        | string, number | Yes      |             |

### `resistance`

```json
"1k"
```

### `rotation`

```json
"90deg"
```

### `route_hint_point`

```json
{
  "x": "3mm",
  "y": "1mm",
  "via": true,
  "to_layer": "bottom"
}
```

| Property | Type           | Required | Description |
| -------- | -------------- | -------- | ----------- |
| x        | string, number | Yes      |             |
| y        | string, number | Yes      |             |
| via      | boolean        | No       |             |
| to_layer | undefined      | No       |             |

### `size`

```json
{
  "width": "5mm",
  "height": "5mm"
}
```

| Property | Type   | Required | Description |
| -------- | ------ | -------- | ----------- |
| width    | number | Yes      |             |
| height   | number | Yes      |             |

### `supplier_name`

```json
"digikey"
```

### `time`

```json
"60s"
```

### `visible_layer`

```json
"bottom"
```

### `voltage`

```json
"5V"
```
