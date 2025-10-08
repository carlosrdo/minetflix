const fs = require('fs').promises;
const path = require("path");

const REG_URL = /(\b(http|ftp|https|ftps):\/\/[-A-ZáéíóúÁÉÍÓÚ0-9+&@#\/%?=~_|!:,.;]*[-A-ZáéíóúÁÉÍÓÚ0-9+&@#\/%=~_|])/ig;

const TestUtils = {};


TestUtils.checkFileExists = (filepath) => {
  return new Promise(async (resolve, reject) => {
    try {
      await fs.access(filepath, fs.F_OK);
      resolve(true);
    } catch (err) {
      resolve(false);
    }
  });
};

TestUtils.to = (promise) => {
    return promise
        .then(data => {
            return [null, data];
        })
        .catch(err => [err]);
};

TestUtils.getURL = (string) => {
    const urls = string.match(REG_URL);
    let url = null;
    if (urls instanceof Array) {
        url = urls[0];
    }
    return url;
};

TestUtils.exists = (thing) => {
    return thing!==undefined && thing!==null;
};

TestUtils.isString = (thing) => {
    return typeof thing === 'string' || thing instanceof String;
};

TestUtils.isObject = (thing) => {
    return typeof thing === 'object' || thing instanceof Object;
};

TestUtils.isNumber = (thing) => {
    let number = false;
    if (TestUtils.exists(thing)) {
        number = typeof parseInt(thing) === "number";
    }
    return number
};

TestUtils.isArray = (thing) => {
    return typeof thing === 'array' || thing instanceof Array;
};

TestUtils.isURL = (thing) => {
    if (TestUtils.isString(thing)) {
        return REG_URL.test(thing);
    }
};

TestUtils.isRegExp = (thing) => {
    return (thing instanceof RegExp);
};

TestUtils.isJSON = (thing) => {
    try {
        JSON.parse(thing);
        return true;
    } catch (e) {
        return false;
    }
};

TestUtils.search = (b, a) => {
    if (TestUtils.isRegExp(b)) {
        if (TestUtils.isString(a) && a.length > 0) {
            return b.test(a);
        } else {
            return false;
        }
    } else {
        if (TestUtils.isArray(a)) {
            let result = false;
            for (let item in a) {
                if (TestUtils.search(b, a[item])) {
                    result = true;
                }
            }
            return result;
        } else {
            if (TestUtils.isString(a.toString())) {
                return (a.toString().toLowerCase().indexOf(b.toLowerCase()) > -1);
            }
        }
    }
};
TestUtils.makeid = (length) => {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}
TestUtils.id = TestUtils.makeid(5);
Array.prototype.shuffle = function(array) {
  return this.sort(() => Math.random() - 0.5);
}
const initial_movies = [{"titulo":"Superlópez","director":"Javier Ruiz Caldera","miniatura":"files/superlopez.png"},{"titulo":"Jurassic Park2","director":"Steven Spielberg","miniatura":"files/jurassicpark.png"},{"titulo":"Interstellar2","director":"Christopher Nolan","miniatura":"files/interstellar.png"}];
TestUtils.movies = Array(Math.floor(Math.random() * 1) + 2).fill((initial_movies.shuffle())).reduce((acc, val) => acc.concat(val));
TestUtils.mockFetch = async (browser) => {
    const id = "movies" + TestUtils.id;
    const mock = `function (URL, options)  {
        if (options && (options.method === "PUT") && options.body) {
            window["${id}"] = JSON.parse(options.body);
            return new Promise(function(resolve, reject){
                            resolve(true);
                        });
        } else {
            return new Promise(function(resolve, reject){
                    resolve({ json: function(){ 
                        return new Promise(function(resolve, reject){
                            resolve(JSON.parse(JSON.stringify(window["${id}"])));
                        });
                    }
                });
            });

        }
    }`;

    browser.evaluate(`try { window["${id}"] = ${JSON.stringify(TestUtils.movies)};} catch (err) {}`);
    browser.evaluate("try { fetch = " + mock + " } catch (err) {}");
    browser.evaluate("try { window.fetch = " + mock + " } catch (err) {}");
    browser.evaluate("try { indexContr(); } catch (err) {}");
    await browser.wait({ duration: 200 });
    return 0;
};

module.exports = TestUtils;