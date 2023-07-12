interface NativeNumber{
    i8: Int8Array;
    u8: Uint8Array;
    i16: Int16Array;
    u16: Uint16Array;
    i32: Int32Array;
    u32: Uint32Array;
    f32: Float32Array;
    f64: Float64Array;
}

interface GPGPUBind{
    group: number;
    binding: number;
    type: keyof NativeNumber;
    target: GPUBuffer;
}

interface GPGPUBindView extends Omit<GPGPUBind, "target">{
    size: number;
}

export class GPGPU{
    #device?:GPUDevice;
    #command?:GPUCommandBuffer;
    #binds:GPGPUBind[];

    constructor(){
        this.#device = undefined;
        this.#command = undefined;
        this.#binds = [];
    }

    static #ta<T extends keyof NativeNumber>(type:T){
        switch(type){
            case "i8": return Int8Array;
            case "u8": return Uint8Array;
            case "i16": return Int16Array;
            case "u16": return Uint16Array;
            case "i32": return Int32Array;
            case "u32": return Uint32Array;
            case "f32": return Float32Array;
            case "f64": return Float64Array;
        }
    }

    #findBind(g:number, b:number){
        return this.#binds.find(({group, binding}) => group === g && binding === b);
    }

    get binds(){
        return this.#binds.map(v => ({
            group: v.group,
            binding: v.binding,
            type: v.type,
            size: v.target.size
        }));
    }

    async read(group:number, binding:number){
        const bind = this.#findBind(group, binding);

        if(!bind){
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

        const TA = GPGPU.#ta(bind.type);
        return new TA(stage.getMappedRange());
    }

    write<T extends NativeNumber[keyof NativeNumber]>(group:number, binding:number, data:T){
        const bind = this.#findBind(group, binding);

        const TA = GPGPU.#ta(bind.type);
        if(!bind || !(data instanceof TA) || data.byteLength !== bind.target.size){
            throw new ReferenceError();
        }

        this.#device.queue.writeBuffer(bind.target, 0, data, 0);
    }

    async setup(){
        if(!navigator.gpu){
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

    async pipeline(wgsl:string){
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

        for(const variable of wgsl.match(/@ {0,}(group|binding)[^;]+/gs).map(v => v.replace(/\n/g, " "))){
            const [, g] = variable.match(/@ {0,}group {0,}\( {0,}(\d+)/) ?? [];
            const [, b] = variable.match(/@ {0,}binding {0,}\( {0,}(\d+)/) ?? [];
            const [, t, s] = variable.match(/array {0,}< {0,}(i8|u8|i16|u16|i32|u32|f32|f64) {0,}, {0,}(\d+)/) ?? [];

            this.#binds.push({
                group: Number(g),
                binding: Number(b),
                type: t,
                target: this.#device.createBuffer({
                    size: GPGPU.#ta(t).BYTES_PER_ELEMENT * Number(s),
                    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
                })
            });
        }

        for(const group of new Set(this.#binds.map(({group}) => group))){
            pass.setBindGroup(group, this.#device.createBindGroup({
                layout: pipeline.getBindGroupLayout(group),
                entries: this.#binds.filter(v => v.group === group).map(({binding, target}) => ({
                    binding: binding,
                    resource: {
                        buffer: target
                    }
                }))
            }));
        }

        const [, x, y, z] = wgsl.match(/@ {0,}workgroup_size {0,}\( {0,}(\d+) {0,}, {0,}(\d+) {0,}, {0,}(\d+)/) ?? [];

        pass.dispatchWorkgroups(Number(x), Number(y ?? "1"), Number(z ?? "1"));
        pass.end();

        this.#command = command.finish();
    }

    execute(){
        this.#device.queue.submit([this.#command]);
    }
}