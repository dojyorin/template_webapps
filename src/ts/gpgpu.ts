/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>

import type {} from "https://esm.sh/@webgpu/types@0.1.34/dist/index.d.ts";

interface GPGPUArray{
    i32: Int32Array;
    u32: Uint32Array;
    f32: Float32Array;
}

interface GPGPUBind{
    group: number;
    binding: number;
    type: keyof GPGPUArray;
    target: GPUBuffer;
}

interface GPGPUBindView extends Omit<GPGPUBind, "target">{
    size: number;
}

interface GPGPUVec3{
    x: number;
    y: number;
    z: number;
}

export class GPGPU{
    #device?:GPUDevice;
    #program?:GPUCommandBuffer;
    #binds:GPGPUBind[];

    constructor(){
        this.#device = undefined;
        this.#program = undefined;
        this.#binds = [];
    }

    static #arrayCon<T extends keyof GPGPUArray>(type:T){
        switch(type){
            case "i32": return Int32Array;
            case "u32": return Uint32Array;
            case "f32": return Float32Array;
            default: throw new Error();
        }
    }

    #findBind(group:number, binding:number){
        const bind = this.#binds.find(v => v.group === group && v.binding === binding);

        if(!bind){
            throw new ReferenceError();
        }

        return bind;
    }

    get binds(){
        const views:GPGPUBindView[] = [];

        for(const {group, binding, target, type} of this.#binds){
            views.push({
                group: group,
                binding: binding,
                type: type,
                size: target.size
            })
        }

        return views;
    }

    async begin(){
        if(this.#device){
            return;
        }

        if(!globalThis?.navigator?.gpu){
            throw new ReferenceError();
        }

        const adapter = await navigator.gpu.requestAdapter({
            powerPreference: "high-performance"
        });

        if(!adapter){
            throw new ReferenceError();
        }

        this.#device = await adapter.requestDevice();

        if(!this.#device){
            throw new ReferenceError();
        }
    }

    async createCommand(wgsl:string, count:GPGPUVec3){
        if(!this.#device){
            throw new ReferenceError();
        }

        const command = this.#device.createCommandEncoder();
        const pass = command.beginComputePass();

        const pipeline = await this.#device.createComputePipelineAsync({
            layout: "auto",
            compute: {
                entryPoint: "main",
                module: this.#device.createShaderModule({
                    code: wgsl
                })
            }
        });

        pass.setPipeline(pipeline);

        for(const variable of wgsl.match(/@ {0,}(group|binding)[^;]+/gs)?.map(v => v.replace(/\r|\n|\t/g, " ")) ?? []){
            const [, g] = variable.match(/@ {0,}group {0,}\( {0,}(\d+)/) ?? [];
            const [, b] = variable.match(/@ {0,}binding {0,}\( {0,}(\d+)/) ?? [];
            const [, t, s] = variable.match(/array {0,}< {0,}(i32|u32|f32) {0,}, {0,}(\d+)/) ?? [];

            this.#binds.push({
                group: Number(g),
                binding: Number(b),
                type: <keyof GPGPUArray>t,
                target: this.#device.createBuffer({
                    size: GPGPU.#arrayCon(<keyof GPGPUArray>t).BYTES_PER_ELEMENT * Number(s),
                    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
                })
            });
        }

        for(const group of new Set(this.#binds.map(({group}) => group))){
            const entries:GPUBindGroupEntry[] = [];

            for(const {binding, target} of this.#binds){
                entries.push({
                    binding: binding,
                    resource: {
                        buffer: target
                    }
                });
            }

            const bg = this.#device.createBindGroup({
                layout: pipeline.getBindGroupLayout(group),
                entries: entries
            });

            pass.setBindGroup(group, bg);
        }

        const [, x, y, z] = wgsl.match(/@ {0,}workgroup_size {0,}\( {0,}(\d+) {0,}, {0,}(\d+) {0,}, {0,}(\d+)/) ?? [];

        pass.dispatchWorkgroups(Number(x) / count.x, Number(y) / count.y, Number(z) / count.z);
        pass.end();

        this.#program = command.finish();
    }

    execute(){
        if(!this.#device || !this.#program){
            throw new ReferenceError();
        }

        this.#device.queue.submit([this.#program]);
    }

    async read<T extends keyof GPGPUArray>(group:number, binding:number, type:T){
        if(!this.#device){
            throw new ReferenceError();
        }

        const bind = this.#findBind(group, binding);

        if(bind.type !== type){
            throw new ReferenceError();
        }

        const stage = this.#device.createBuffer({
            size: bind.target.size,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
            mappedAtCreation: false
        });

        const command = this.#device.createCommandEncoder();
        command.copyBufferToBuffer(bind.target, 0, stage, 0, stage.size);

        this.#device.queue.submit([command.finish()]);

        await stage.mapAsync(GPUMapMode.READ);

        return <GPGPUArray[T]>new (GPGPU.#arrayCon(bind.type))(stage.getMappedRange());
    }

    write<T extends GPGPUArray[keyof GPGPUArray]>(group:number, binding:number, data:T){
        if(!this.#device){
            throw new ReferenceError();
        }

        const bind = this.#findBind(group, binding);

        const TA = GPGPU.#arrayCon(bind.type);
        if(!(data instanceof TA)){
            throw new ReferenceError();
        }

        this.#device.queue.writeBuffer(bind.target, 0, data, 0);
    }
}