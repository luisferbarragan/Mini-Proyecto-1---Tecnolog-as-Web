function mostrarPantalla(id){

let pantallas = document.querySelectorAll(".pantalla")

pantallas.forEach(p=>{
p.classList.add("d-none")
})

document.getElementById(id).classList.remove("d-none")

}