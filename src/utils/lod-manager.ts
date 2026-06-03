
export interface LODConfig {
  distances: number[];
  geometries: any[];
}

export class LODManager {
  private configs = new Map<string, LODConfig>();

  register(id: string, config: LODConfig) {
    this.configs.set(id, config);
  }

  getGeometry(id: string, distance: number): any {
    const config = this.configs.get(id);
    if (!config) return null;
    
    for (let i = 0; i < config.distances.length; i++) {
      if (distance <= config.distances[i]) {
        return config.geometries[i];
      }
    }
    return config.geometries[config.geometries.length - 1];
  }
}
