// IMPORTS
const path = require('path');
const Utils = require('./testutils');

// CRITICAL ERRORS
let error_critical = null;

// CONSTANTS
const T_TEST = 2 * 60; // Time between tests (seconds)
const browser = new Browser({waitDuration: 100, silent: true});
const path_assignment = path.resolve(path.join(__dirname, "../index.html"));
const URL = "file://" + path_assignment.replace("%", "%25");
const to = function to(promise) {
    return promise
        .then(data => {
            return [null, data];
        })
        .catch(err => [err]);
}; 


//TESTS
describe("MVC_peliculas", function () {

    this.timeout(T_TEST * 1000);

    it("1(Precheck): Comprobando que existe el fichero de la entrega...", async function () {
        this.name = ``;
        this.score = 0;
        this.msg_ok = `Encontrado el fichero '${path_assignment}'`;
        this.msg_err = `No se encontró el fichero '${path_assignment}'`;
        const fileexists = await Utils.checkFileExists(path_assignment);
        if (!fileexists) {
            error_critical = this.msg_err;
        }
        fileexists.should.be.equal(true);
    });

    it("2(Precheck): Comprobando que el fichero contiene HTML válido...", async function () {
        this.score = 0;
        if (error_critical) {
            this.msg_err = error_critical;

        } else {
            this.msg_ok = `El fichero '${path_assignment}' se ha parseado correctamente`;
            this.msg_err = `Error al parsear '${path_assignment}'`;
            [error_nav, resp] = await to(browser.visit(URL));
            if (error_nav) {
                this.msg_err = `Error al parsear '${path_assignment}': ${error_nav}`;
                error_critical = this.msg_err;
            }
        }
        should.not.exist(error_critical);
    });

    it("3(Precheck): Comprobando que se actualiza correctamente una película (Edit + Update)...", async function () {
        this.score = 0;
        if (error_critical) {
            this.msg_err = error_critical;
            should.not.exist(error_critical);
        } else {
            [error_nav, resp] = await to(browser.visit(URL));
            if (error_nav) {

                this.msg_err = `Error al abrir el fichero ${path_assignment}
                Error: ${error_nav}
                Recibido: ${browser.text('body')}`;
            }

            this.msg_err = "No se encuentra el botón con clase 'edit'";
            await Utils.mockFetch(browser);
            try {
                [error_nav, resp] = await to(browser.click('.edit'));
                this.msg_err = "No se encuentra el input con clase 'titulo'";
                
            } catch (e) {
                this.msg_err = `Error al hacer click en el botón con clase 'edit'`;
            }
            if (error_nav, resp) {
                this.msg_err = `Error al hacer click en el botón con clase 'edit'`;
            }
            [error_nav, resp] = await to(browser.fill('#titulo', "Titanic7"));
            if (error_nav) {
                this.msg_err = `Error al rellenar el campo de título`;
            }

            this.msg_err = "No se encuentra el input con clase 'director'";
            [error_nav, resp] = await to(browser.fill('#director', "James Cameron"));
            if (error_nav) {
                this.msg_err = `Error al rellenar el campo de director`;
            }

            this.msg_err = "No se encuentra el input con clase 'miniatura'";
            [error_nav, resp] = await to(browser.fill('#miniatura', "https://www.storytel.com/images/200x200/0000011196.jpg"));
            if (error_nav) {
                this.msg_err = `Error al rellenar el campo de miniatura`;
            }

            this.msg_err =  `Error al hacer click en el botón con clase 'update'`;
            [error_nav, resp] = await to(browser.click('.update'));

            if (error_nav) {
                this.msg_err = `Error al hacer click en el botón con clase 'update'`;
            }

            this.msg_ok = "Se ha editado correctamente una película";
            this.msg_err = "No se ha editado correctamente una película";
            browser.evaluate(`mis_peliculas = []; 
                try { 
                    indexContr(); 
                } catch (err) {}
            `);

            [...browser.querySelectorAll(".movie .title" )].map((movie, index) => {
                const received = movie.innerHTML.trim();
                const expected = index === 0 ? "Titanic7" : Utils.movies[index].titulo;
                (expected === received).should.be.equal(true);
            });

        }
    });


    it("4: Comprobando que las películas se descargan correctamente desde la API (Index)...", async function () {
        this.score = 2.5;
        if (error_critical) {
            this.msg_err = error_critical;
            should.not.exist(error_critical);
        } else {
            [error_nav, resp] = await to(browser.visit(URL));
            if (error_nav) {
                this.msg_err = `Error al abrir el fichero ${path_assignment}
                Error: ${error_nav}
                Recibido: ${browser.text('body')}`;
            }
            await Utils.mockFetch(browser);

            this.msg_ok = "Se han descargado correctamente las películas de la API";
            this.msg_err = "No se han descargado las películas";
            const movies = [...browser.querySelectorAll(".movie .title" )];
            Utils.movies.map((movie, index) => {
                const received = movies[index].innerHTML.trim();
                const expected = movie.titulo;
                (expected === received).should.be.equal(true);
            });
            Utils.movies.length.should.be.equal(movies.length);
        }
    });

    it("5: Comprobando que se crea una película nueva (New + Create)...", async function () {
        this.score = 2.5;
        if (error_critical) {
            this.msg_err = error_critical;
            should.not.exist(error_critical);
        } else {
            [error_nav, resp] = await to(browser.visit(URL));
            if (error_nav) {
                this.msg_err = `Error al abrir el fichero ${path_assignment}
                Error: ${error_nav}
                Recibido: ${browser.text('body')}`;
            }
            this.msg_err = "No se encuentra el botón con clase 'new'";
            await Utils.mockFetch(browser);

            [error_nav, resp] = await to(browser.click('.new'));
            if (error_nav) {
                this.msg_err = `Error al hacer click en el botón con clase 'new'`;
            }
            this.msg_err = "No se encuentra el input con clase 'titulo'";

            [error_nav, resp] = await to(browser.fill('#titulo', "Titanic"));
            if (error_nav) {
                this.msg_err = `Error al rellenar el campo de título`;
            }

            this.msg_err = "No se encuentra el input con clase 'director'";
            [error_nav, resp] = await to(browser.fill('#director', "James Cameron"));
            if (error_nav) {
                this.msg_err = `Error al rellenar el campo de director`;
            }

            this.msg_err = "No se encuentra el input con clase 'miniatura'";
            [error_nav, resp] = await to(browser.fill('#miniatura', "https://www.storytel.com/images/200x200/0000011196.jpg"));
            if (error_nav) {
                this.msg_err = `Error al rellenar el campo de miniatura`;
            }


            this.msg_err =  `Error al hacer click en el botón con clase 'create'`;
            [error_nav, resp] = await to(browser.click('.create'));

            if (error_nav) {
                this.msg_err = `Error al hacer click en el botón con clase 'create'`;
            }


            this.msg_ok = "Se ha creado correctamente una nueva película";
            this.msg_err = "Se ha rellenado el formulario de creación de la película pero no se ha enviado correctamente a myjson a través de la API";

            [...browser.querySelectorAll(".movie .title" )].map((movie, index) => {
                const received = movie.innerHTML.trim();
                const expected = index === Utils.movies.length ? "Titanic" : Utils.movies[index].titulo;
                (expected === received).should.be.equal(true);
            });

            (browser.querySelectorAll(".movie .title" ).length).should.be.equal(Utils.movies.length + 1);

        }
    });
    
    it("6: Comprobando que se elimina una película existente (Delete)...", async function () {
        this.score = 2.5;
        if (error_critical) {
            this.msg_err = error_critical;
            should.not.exist(error_critical);
        } else {
            [error_nav, resp] = await to(browser.visit(URL));
            if (error_nav) {
                this.msg_err = `Error al abrir el fichero ${path_assignment}
                Error: ${error_nav}
                Recibido: ${browser.text('body')}`;
            }
            await Utils.mockFetch(browser);
            let movies = browser.querySelectorAll('.movie');
            const expected = Utils.movies.length - 1;

            this.msg_err = "No se encuentra el botón con clase 'delete'";
            [error_nav, resp] = await to(browser.click('button.delete'));
            if (error_nav) {
                this.msg_err =  `Error al hacer click en el botón con clase 'delete'`;
            }
            const newMovies = browser.querySelectorAll('.movie').length;
            this.msg_err = `No se ha borrado la película seleccionada`;
            this.msg_ok = "Se ha borrado correctamente una película";
            newMovies.should.be.equal(expected);
        }
    });

    it("7: Comprobando que se resetean las películas iniciales (Reset)...", async function () {
        this.score = 2.5;
        if (error_critical) {
            this.msg_err = error_critical;
            should.not.exist(error_critical);
        } else {
            [error_nav, resp] = await to(browser.visit(URL));
            if (error_nav) {
                this.msg_err = `Error al abrir el fichero ${path_assignment}
                Error: ${error_nav}
                Recibido: ${browser.text('body')}`;
            }
            await Utils.mockFetch(browser);
            this.msg_err = `La funcionalidad de 'reset' no se ha implementado correctamente`;
            let movies = browser.querySelectorAll('.movie');
            const expected = Utils.movies.length;
            (movies.length).should.be.equal(expected);

            this.msg_err = "No se encuentra el botón con clase 'reset'";
            [error_nav, resp] = await to(browser.click('button.reset'));
            if (error_nav) {
                this.msg_err =  `Error al hacer click en el botón con clase 'reset'`;
            }
            const newMovies = browser.querySelectorAll('.movie').length;
            this.msg_err = `No se han reseteado correctamente las películas iniciales`;
            this.msg_ok = "Se han reseteado correctamente las peliculas iniciales";
            newMovies.should.be.equal(3);
        }
    });

    after(async function() {
        try {
            await browser.tabs.closeAll(); 
        } catch(e) {}
    });
});
