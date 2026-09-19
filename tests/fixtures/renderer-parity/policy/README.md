# Renderer policy fixture provenance

This directory holds the captured inputs used by the renderer policy-comparison
stories. The preparation script copies model assets into
`stories/renderer-comparison/public/assets/policy/` and rewrites URLs in cloned
Circuit JSON using `policyModelAssets` and `policyModelUrls`. Captured seed files
are never overwritten.

## Captured assets

| File | Provenance | SHA-256 |
| --- | --- | --- |
| `TO-92_Inline.step` | `tests/assets/TO-92_Inline.step` from `tscircuit/circuit-json-to-gltf` at `986b609b54b8c79859d5e900a1f181b98dc7573e` | `f0b61c32ecbf0067157adc5a3d4966ceadf5d6dafe93c51af35f76c41c71a54a` |
| `flashlight-usb.obj` | `model_obj_url` from the USB-C flashlight fixture in `tscircuit/circuit-json-to-gltf` at `986b609b54b8c79859d5e900a1f181b98dc7573e` | `c05f126592479dfae9bedf776a405272e8196001a9d97b0fc6ea3e56d58f9447` |
| `soic8/soic8.gltf` | `model_gltf_url` from the SOIC8 glTF fixture in `tscircuit/circuit-json-to-gltf` at `986b609b54b8c79859d5e900a1f181b98dc7573e` | `3317f992d9d66b2e16fa6f788b90ed96c92d567cb6ec20d10af84a0238c420c4` |
| `scale-fit.stl` | ASCII STL triangle from `tests/unit/cad-component-scale.test.ts` in `tscircuit/circuit-json-to-gltf` at `986b609b54b8c79859d5e900a1f181b98dc7573e` | `bd51e353bc1406d66a5787c52c0640b8a3e13ce64a17fb9921098be7679e2887` |
| `scale-fit.obj` | Derived decoder-independent control for the original STL's two triangles, not an upstream OBJ asset | `fd9fbb5e0e6ede4c5bf57467ccaa090413879eaab6b6e095aa0d27cd1c71c4e5` |

The SOIC8 glTF payload had no external buffers or images; the file is self-contained.
The flashlight OBJ embeds its material definition inline and does not require a separate MTL.

## Captured seeds

All upstream paths below refer to `tscircuit/circuit-json-to-gltf` at
`986b609b54b8c79859d5e900a1f181b98dc7573e`, the published `0.0.130` git revision.
The raw JSON copies and STEP asset retain the upstream bytes; the TO-92 seed
is frozen generated output rather than a copied upstream JSON file.

| File | Provenance | Notes | SHA-256 |
| --- | --- | --- | --- |
| `to92.circuit.json` | Frozen output from `tests/repro/repro13-to92-inline-origin-alignment.test.tsx`, using `tests/assets/TO-92_Inline.step` | The explicit `model_origin_position` datum is intentionally omitted here. | `32f284b169a67aa68d94a38beb4770ddaf5f754142b5716e3dff01e63874651f` |
| `flashlight.circuit.json` | Raw `tests/assets/usb-c-flashlight.json` copy | Preserves the original sparse placement fields and original model URL. | `1752787d4c33fbf073a079c884d9ddf3eb1a274a3009c5c80dd9481d5a9824c3` |
| `soic-gltf.circuit.json` | Raw `tests/fixtures/circuit-with-gltf-url.json` copy | Keeps the omitted CAD position/source association and the original glTF URL. | `e7ec148f59f672231d9467b0441e1df493f31bdb8f9bb7e54c1737dbc3bd638c` |
| `soic-footprinter.circuit.json` | Raw `tests/fixtures/circuit-with-footprinter.json` copy | Keeps the omitted CAD position/source association and the original footprinter string. | `4c083a67aa6bb22a6325fa06d750fe8e472d2c2a1bf26e5439273285a92f922d` |
| `scale-fit.circuit.json` | Derived from `tests/unit/cad-component-scale.test.ts` | Boardless input, `model_unit_to_mm_scale_factor=2`, `size=(1,1,1)`, and no `source_component_id` on the cad component. The STL URL is already the local `assets/policy/scale-fit.stl` path. | `9ed63b71d29d1a4934c5b5230c1760edb4bbb9a78d9544c416e7cfea589f4751` |

## Acquisition notes

- No new package dependencies were added.
- The public model payloads were captured directly from the source exporter
  checkout or from the public model CDN URLs referenced by the original tests.
- The TO-92 circuit capture is deliberately the original missing-origin case;
  the explicit midpoint control is added separately by the story definition.
  If the exporter materializes an absolute path during capture, normalize it
  back to the stable source-relative `tests/assets/TO-92_Inline.step` URL.
- The scale-fit fixture stays boardless so the original viewer's faux-board
  preprocessing remains observable. The separately labelled OBJ control adds a
  shared explicit board to isolate fitting from preprocessing and STL decoding.
- STEP uses the production viewer's existing `occt-import-js@0.0.23` CDN runtime.
  Model bytes are local; loading the STEP runtime still requires network access.
