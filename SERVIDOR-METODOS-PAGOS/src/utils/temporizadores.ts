export const delayCustom = async(delayCustom:number, inicioCodigo:number, finCodigo:number)=>{
    await new Promise((resolve)=>{
        setTimeout(resolve, delayCustom - (finCodigo - inicioCodigo))
    })
}