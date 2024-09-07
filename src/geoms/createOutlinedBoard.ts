import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import type { Vec3 } from "@jscad/modeling/src/maths/types"
import { polygon, polyhedron } from "@jscad/modeling/src/primitives"
import type { Point } from "@tscircuit/soup"
import { PolyhedronGeometry } from "three"

export const createOutlinedBoard=(points:Point[], depth= 1.2):Geom3=>{
const bottomPoints: Vec3[] = points.map((point)=>[point.x,point.y,-depth/2])
const topPoints: Vec3[] = points.map((point)=>[point.x,point.y,depth/2])
const vectorPoints: Vec3[] = [...bottomPoints, ...topPoints]

const topFace:number[] = []
const bottomFace:number[] = []
for(let i = (vectorPoints.length / 2) - 1, j = vectorPoints.length / 2; j < vectorPoints.length; i--, j++){
    topFace.push(j)
    bottomFace.push(i)
}

const sides: number[][] = []
for(let i = 0, j = bottomFace.length - 1 ; i < topFace.length ; i ++, j --){
    const side: number[] = []
    side.push(bottomFace[j], bottomFace[j-1 < 0?bottomFace.length - 1:j -1])
    side.push(topFace[i+1 === topFace.length? 0: i + 1], topFace[i])
    sides.push(side)
}

const myfaces = [topFace, bottomFace,...sides]
return polyhedron({points: vectorPoints, faces: myfaces, orientation: 'inward'})
}