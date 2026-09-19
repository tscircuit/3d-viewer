export interface PolicyModelAsset {
  source: string
  destination: string
}

export interface PolicyModelMetadata {
  source: string
  sourceRepo: string
  sourceCommit: string
  sha256: string
  note?: string
}

export interface PolicyFixtureMetadata {
  seed: string
  targetCadId: string
  sha256: string
  note?: string
}

export const policyModelAssets = [
  {
    source: "tests/fixtures/renderer-parity/policy/TO-92_Inline.step",
    destination: "policy/TO-92_Inline.step",
  },
  {
    source: "tests/fixtures/renderer-parity/policy/flashlight-usb.obj",
    destination: "policy/flashlight-usb.obj",
  },
  {
    source: "tests/fixtures/renderer-parity/policy/soic8/soic8.gltf",
    destination: "policy/soic8/soic8.gltf",
  },
  {
    source: "tests/fixtures/renderer-parity/policy/scale-fit.stl",
    destination: "policy/scale-fit.stl",
  },
  {
    source: "tests/fixtures/renderer-parity/policy/scale-fit.obj",
    destination: "policy/scale-fit.obj",
  },
] as const satisfies readonly PolicyModelAsset[]

export const policyModelUrls: Readonly<Record<string, string>> = {
  "tests/assets/TO-92_Inline.step": "assets/policy/TO-92_Inline.step",
  "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=2a4bc2358b36497d9ab2a66ab6419ba3&pn=C165948&cachebust_origin=":
    "assets/policy/flashlight-usb.obj",
  "https://modelcdn.tscircuit.com/jscad_models/soic8.gltf":
    "assets/policy/soic8/soic8.gltf",
}

export const policyModelMetadata = [
  {
    source: "tests/fixtures/renderer-parity/policy/TO-92_Inline.step",
    sourceRepo: "tscircuit/circuit-json-to-gltf",
    sourceCommit: "986b609b54b8c79859d5e900a1f181b98dc7573e",
    sha256: "f0b61c32ecbf0067157adc5a3d4966ceadf5d6dafe93c51af35f76c41c71a54a",
    note: "Captured from the original TO-92 STEP test without model_origin_position; the source-relative tests/assets/TO-92_Inline.step URL is preserved as the stable seed URL.",
  },
  {
    source: "tests/fixtures/renderer-parity/policy/flashlight-usb.obj",
    sourceRepo: "tscircuit/circuit-json-to-gltf",
    sourceCommit: "986b609b54b8c79859d5e900a1f181b98dc7573e",
    sha256: "c05f126592479dfae9bedf776a405272e8196001a9d97b0fc6ea3e56d58f9447",
    note: "Copied from the original USB-C flashlight model_obj_url.",
  },
  {
    source: "tests/fixtures/renderer-parity/policy/soic8/soic8.gltf",
    sourceRepo: "tscircuit/circuit-json-to-gltf",
    sourceCommit: "986b609b54b8c79859d5e900a1f181b98dc7573e",
    sha256: "3317f992d9d66b2e16fa6f788b90ed96c92d567cb6ec20d10af84a0238c420c4",
    note: "Public glTF payload for the SOIC8 comparison; no external buffers or images were present.",
  },
  {
    source: "tests/fixtures/renderer-parity/policy/scale-fit.stl",
    sourceRepo: "tscircuit/circuit-json-to-gltf",
    sourceCommit: "986b609b54b8c79859d5e900a1f181b98dc7573e",
    sha256: "bd51e353bc1406d66a5787c52c0640b8a3e13ce64a17fb9921098be7679e2887",
    note: "ASCII STL copy of the unit-scale / target-size fixture triangle.",
  },
  {
    source: "tests/fixtures/renderer-parity/policy/scale-fit.obj",
    sourceRepo: "tscircuit/circuit-json-to-gltf",
    sourceCommit: "986b609b54b8c79859d5e900a1f181b98dc7573e",
    sha256: "fd9fbb5e0e6ede4c5bf57467ccaa090413879eaab6b6e095aa0d27cd1c71c4e5",
    note: "Derived decoder-independent OBJ control with the original STL's two triangles; not an upstream OBJ asset.",
  },
] as const satisfies readonly PolicyModelMetadata[]

export const policyFixtureMetadata = [
  {
    seed: "tests/fixtures/renderer-parity/policy/to92.circuit.json",
    targetCadId: "cad_component_0",
    sha256: "32f284b169a67aa68d94a38beb4770ddaf5f754142b5716e3dff01e63874651f",
    note: "Frozen circuit JSON from the original TO-92 repro, with the datum omitted and the source-relative tests/assets/TO-92_Inline.step URL preserved.",
  },
  {
    seed: "tests/fixtures/renderer-parity/policy/flashlight.circuit.json",
    targetCadId: "cad_component_0",
    sha256: "1752787d4c33fbf073a079c884d9ddf3eb1a274a3009c5c80dd9481d5a9824c3",
    note: "Raw flashlight fixture copied without injecting any origin or position fields.",
  },
  {
    seed: "tests/fixtures/renderer-parity/policy/soic-gltf.circuit.json",
    targetCadId: "cad1",
    sha256: "e7ec148f59f672231d9467b0441e1df493f31bdb8f9bb7e54c1737dbc3bd638c",
    note: "Original SOIC8 glTF fixture with the sparse CAD record preserved.",
  },
  {
    seed: "tests/fixtures/renderer-parity/policy/soic-footprinter.circuit.json",
    targetCadId: "cad1",
    sha256: "4c083a67aa6bb22a6325fa06d750fe8e472d2c2a1bf26e5439273285a92f922d",
    note: "Original SOIC8 footprinter fixture with the sparse CAD record preserved.",
  },
  {
    seed: "tests/fixtures/renderer-parity/policy/scale-fit.circuit.json",
    targetCadId: "cad1",
    sha256: "9ed63b71d29d1a4934c5b5230c1760edb4bbb9a78d9544c416e7cfea589f4751",
    note: "Boardless STL fixture that keeps the original unit-scale and size fields.",
  },
] as const satisfies readonly PolicyFixtureMetadata[]
