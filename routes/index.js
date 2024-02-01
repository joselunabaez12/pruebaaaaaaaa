const express = require('express');
const router = express.Router();
const Sqlite3 = require("sqlite3").verbose();
const path = require('path');
const jwt = require("jsonwebtoken");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { promisify } = require("util");
const db = path.join(__dirname, "/db", "database.db");
const nodemailer = require('nodemailer');
const { Database } = require('sqlite3');
require('dotenv').config()
const dataBase = new Sqlite3.Database(db, (err) => {
  console.log('Database created');
});


const images = "CREATE TABLE images (id INTEGER PRIMARY KEY AUTOINCREMENT,producto_id INTEGER NOT NULL,url TEXT NOT NULL,destacado BOOLEAN NOT NULL,FOREIGN KEY (producto_id) REFERENCES productos (id));"
const category = "CREATE TABLE categorys (id INTEGER PRIMARY KEY AUTOINCREMENT,nombre TEXT NOT NULL);";
const clients = "CREATE TABLE clients (id INTEGER PRIMARY KEY AUTOINCREMENT,name VARCHAR(255) NOT NULL,apellido VARCHAR(255) NOT NULL,email VARCHAR(255) NOT NULL,password VARCHAR(255) NOT NULL);"
const products = "CREATE TABLE products (id INTEGER PRIMARY KEY AUTOINCREMENT,nombre TEXT NOT NULL,codigo TEXT NOT NULL,precio NUMERIC NOT NULL,software TEXT NOT NULL,estado TEXT NOT NULL,descripcion TEXT NOT NULL,categoria_id INTEGER NOT NULL,FOREIGN KEY (categoria_id) REFERENCES categorias (id))";
const ventas = "CREATE TABLE ventas (client_id INTEGER NOT NULL,producto_id INTEGER NOT NULL,cantidad INTEGER NOT NULL,total_pagado DECIMAL(10,2),fecha INTEGER NOT NULL,ip_client VARCHAR(200),FOREIGN KEY (client_id) REFERENCES clientes(id),FOREIGN KEY (producto_id) REFERENCES products(id));"
const calificacion = "CREATE TABLE calificacion (producto_id INTEGER NOT NULL,user_id INTEGER NOT NULL,rating INTEGER NOT NULL)"

dataBase.run(calificacion, err => {
  err ? err : console.log('calificacion')
})

dataBase.run(images, err => {
  err ? err : console.log('img')
})

dataBase.run(clients, err => {
  err ? err : console.log('clients')
})

dataBase.run(ventas, err => {
  err ? err : console.log('ventas')
})

dataBase.run(category, err => {
  err ? err : console.log('category')
})


dataBase.run(products, err => {
  err ? err : console.log('products')
})




protectRoute = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      const tokenAuthorized = await promisify(jwt.verify)(req.cookies.jwt, 'token');
      if (tokenAuthorized) {
        return next();
      }
      req.user = row.id;
    } catch (error) {
      console.log(error);
      return next();
    }
  } else {
    res.redirect("/loginClient");
  }
};
/*Proteger el login*/
protectRouteLogin = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      const tokenAuthorized = await promisify(jwt.verify)(req.cookies.jwt, 'token');
      if (tokenAuthorized) {
        res.redirect("/client");
      }
    } catch (error) {
      console.log(error);
      res.redirect("/client");
    }
  } else {
    return next();
  }
};

logout = async (req, res) => {
  res.clearCookie("jwt");
  return res.redirect("/loginClient");
};


/* GET home page. */
router.get("/dashboard", (req, res) => {
  dataBase.all(`SELECT * FROM products`, [], (err, products) => {
    dataBase.all(`SELECT * FROM categorys`, [], (err, categorys) => {
      dataBase.all(`SELECT images.*, products.* FROM products JOIN images ON products.id = images.producto_id OR products.id = ""`, [], (err, images) => {
        res.render('dashboard', {
          p: products,
          c: categorys,
          img: images
        })
      })
    })
  })
})



router.get('/product', (req, res) => {
  dataBase.all(`SELECT * FROM categorys`, [], (err, categorys) => {
    res.render('product', {
      c: categorys,
    })
  })
})

router.post('/product', (req, res) => {
  const { name, code, price, software, state, description, category } = req.body;
  dataBase.run(`INSERT INTO products(nombre,codigo,precio,software,estado,descripcion,categoria_id) VALUES (?,?,?,?,?,?,?)`,
    [name, code, price, software, state, description, category], (err, row) => {
      if (err) {
        console.log(err)
      }
      else {
        dataBase.get(`SELECT * FROM products`, (err, rowp) => {
          dataBase.run(`INSERT INTO images(producto_id,url,destacado) VALUES (?,?,?)`, [rowp.id, '', 1], (err) => {
            err ?
              console.log(err)
              :
              res.redirect('/dashboard');
          })
        })

      }
    })
})

router.get('/edit_product/:id', (req, res) => {
  const { id } = req.params;
  dataBase.all(`SELECT * FROM categorys`, [], (err, categorys) => {
    dataBase.get(`SELECT * FROM products WHERE id = ?`, id, (err, prod) => {
      if (err) {
        console.log(err)
      } else {
        res.render('product_edit', {
          c: categorys,
          rowProduct: prod
        })
      }
    })
  })
})

router.post('/edit_product/:id', (req, res) => {
  const { id } = req.params;
  const { name, code, price, software, state, description, category } = req.body;
  dataBase.run(`UPDATE products SET nombre = ?,codigo = ?,precio = ?,software = ?,estado = ?,descripcion = ?,categoria_id = ? WHERE id = ?`,
    name, code, price, software, state, description, category, id, err => {
      err ?
        console.log(err)
        :
        res.redirect('/dashboard');
    })
})


router.get('/deleteproduct/:id', (req, res) => {
  const { id } = req.params;
  const sqlQuery = "DELETE FROM products WHERE id = ?";
  const sqlQueryImg = "DELETE FROM images WHERE producto_id = ?"
  dataBase.run(sqlQuery, id, (err, query) => {
    dataBase.run(sqlQueryImg, id, (err, queryimg) => {
      res.redirect('/dashboard');
    })
  })
})



router.get('/category', (req, res) => {
  dataBase.all(`SELECT * FROM categorys`, [], (err, categorys) => {
    res.render('category', {
      c: categorys,
    })
  })
})

router.post('/category', (req, res) => {
  const { category } = req.body;
  dataBase.run(`INSERT INTO categorys(nombre) VALUES(?)`, [category], err => {
    err ?
      console.log(err)
      :
      res.redirect('/dashboard');
  })
})


/*Get category for id*/

router.get('/category/:id', (req, res) => {
  const { id } = req.params;
  const sqlCategory = "SELECT * FROM categorys";
  const sqlQuery = "SELECT * FROM products WHERE categoria_id = ?";
  const sqlImg = "SELECT products.*, images.url FROM products LEFT JOIN images ON products.id = images.producto_id WHERE products.categoria_id = ?";
  dataBase.all(sqlCategory, [], (err, categorys) => {
    dataBase.all(sqlQuery, id, (err, prod) => {
      dataBase.all(sqlImg, id, (err, img) => {
        console.log(img)
        res.render('client', {
          p: prod,
          c: categorys,
          img: img
        })
      })
    })
  })
})


router.post('/client/filter', (req, res) => {
  const { name, state, software, rating } = req.body;
  const sqlImg = "SELECT products.*, images.url, AVG(calificacion.rating) FROM products LEFT JOIN images ON products.id = images.producto_id LEFT JOIN calificacion ON products.id = calificacion.producto_id WHERE (products.nombre = ? OR products.software = ? OR products.estado = ? OR calificacion.rating = ?) GROUP BY products.id;";
  const sqlCategory = "SELECT * FROM categorys";
  const search = [name, software, state, rating]
  dataBase.all(sqlCategory, [], (err, categorys) => {
    dataBase.all(sqlImg, search, (err, img) => {
        console.log('Productos: ', img)
        res.render('client', {
          p: img,
          c: categorys,
          img: img,
          d:calificacion
      })
    })
  })
})






router.get('/editcategory', (req, res) => {
  dataBase.all(`SELECT * FROM categorys`, [], (err, categorys) => {
    res.render('category_edit', {
      c: categorys,
    })
  })

})

router.post('/editcategory/:id', (req, res) => {
  const { id } = req.params;
  const { category } = req.body;
  dataBase.run(`UPDATE categorys SET nombre = ? WHERE (id = ?)`, category, id, err => {
    if (err) {
      console.log(err)
    } else {
      res.redirect('/dashboard')
    }
  })
})


router.get('/addimage/:id', (req, res) => {
  const { id } = req.params;
  dataBase.all(`SELECT * FROM categorys`, [], (err, categorys) => {
    dataBase.all(`SELECT * FROM products WHERE id = ?`, id, (err, products) => {
      res.render('image', {
        c: categorys,
        p: products
      })
    })
  })
})


router.post('/addimage/:id', (req, res) => {
  const { id } = req.params;
  const { url } = req.body;
  dataBase.run(`UPDATE images SET producto_id = ?, url = ?, destacado = ? WHERE id = ?`, [id, url, 1, id], (err) => {
    err ?
      console.log(err)
      :
      res.redirect('/dashboard');
  })
})


router.get('/', (req, res) => {
  res.render('index');
})


router.post('/login', (req, res) => {
  const { user, password } = req.body;
  if (user == process.env.USER && password == process.env.PASSWORD) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/');
  }
})


router.get('/loginClient', protectRouteLogin, (req, res) => {
  res.render('clientLogin');
})

router.get('/registerClient', protectRouteLogin, (req, res) => {
  res.render('clientRegister', {
    gk: process.env.GK
  });
})

router.post('/registerClient', async (req, res) => {
  const { name, apellido, email, password } = req.body;
  const userEmail = process.env.EMAIL;
  const userPassword = process.env.EMAILPASSWORD;
  const secretKey = process.env.GKPRIVATE;
  const gRecaptchaResponse = req.body['g-recaptcha-response'];
  const response = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${gRecaptchaResponse}`, {
    method: 'POST',
  });

  const captcha = await response.json();

  if (captcha.success) {
    dataBase.get(`SELECT * FROM clients WHERE email = ?`, [email], (err, row) => {
      if (row) {
        console.log('Este usuario ya existe');
        res.redirect('/registerclient')
      } else {
        dataBase.get(`INSERT INTO clients(name,apellido,email,password) VALUES(?,?,?,?)`, [name, apellido, email, password], (err, rows) => {
          if (err) {
            console.log(err)
          } else {

            const transporter = nodemailer.createTransport({
              service: 'outlook',
              port: 587,
              tls: {
                ciphers: "SSLv3",
                rejectUnauthorized: false,
              },
              auth: {
                user: userEmail,
                pass: userPassword,
              },
            });

            const mailOptions = {
              from: userEmail,
              to: email,
              subject: '¡Bienvenido a nuestra página web!',
              html: '<h1>¡Hola!</h1><p>Bienvenido nuestra página web! Esperamos que disfrutes de tu experiencia aquí. Si necesitas ayuda, no dudes en ponerte en contacto con nosotros. ¡Gracias por registrarte!</p>' // html body
            };

            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                console.log(error);
              } else {
                console.log('Email sent: ' + info.response);
              }
            });
            res.redirect('/loginclient')
          }
        })
      }
    })
  } else {
    res.status(500).send('¡No se verifico el captcha!');
  }

});

router.post('/loginClient', (req, res) => {
  const { email, password } = req.body;
  dataBase.get(`SELECT * FROM clients WHERE email = ? AND password = ?`, [email, password], (err, row) => {
    if (row) {
      const id = row.id;
      console.log(row)
      const token = jwt.sign({ id: id }, 'token');
      res.cookie("jwt", token);
      res.redirect('/client')
    }
    else {
      console.log('Datos incorrectos');
      res.redirect('/loginClient')
    }
  })
})


router.get('/clients', (req, res) => {
  dataBase.all(`SELECT * FROM categorys`, [], (err, categorys) => {
    dataBase.all(`SELECT products.*, clients.*, ventas.total_pagado, ventas.cantidad FROM products JOIN ventas ON products.id = ventas.producto_id JOIN clients ON clients.id = ventas.client_id;`, (err, query) => {
      res.render('clients', {
        p: query,
        c: categorys,
      })
    })
  })
})


router.get("/client", (req, res) => {
  dataBase.all("SELECT products.*, images.url, AVG(calificacion.rating) FROM products LEFT JOIN images ON products.id = images.producto_id LEFT JOIN calificacion ON products.id = calificacion.producto_id GROUP BY products.id;", [], (err, products) => {
    console.log(products)
        res.render('client', {
          p: products,
          c: products,
          img: products,
        })
      })
    })


router.get("/client/:id", (req, res) => {
  const { id } = req.params;
  dataBase.get(`SELECT * FROM products WHERE id = ?`, id, (err, products) => {
    dataBase.all(`SELECT * FROM categorys`, [], (err, categorys) => {
      dataBase.get(`SELECT * FROM images WHERE producto_id = ?`, id, (err, images) => {
        res.render('productView', {
          p: products,
          c: categorys,
          img: images
        })
      })
    })
  })
})

router.post("/buytocart/:id", protectRoute, async (req, res) => {
  const { id } = req.params;
  const { cant, totalPagado } = req.body;
  const totalCar = totalPagado * cant;
  dataBase.get(`SELECT * FROM products WHERE id = ?`, id, (err, products) => {
    dataBase.all(`SELECT * FROM categorys`, [], (err, categorys) => {
      dataBase.get(`SELECT * FROM images WHERE producto_id = ?`, id, (err, images) => {
        res.render('buycar', {
          p: products,
          c: categorys,
          img: images,
          tc: totalCar,
          ct: cant
        })
      })
    })
  })
})





router.post("/buytocart/product/:id", async (req, res) => {
  const { id } = req.params;
  const userEmail = process.env.EMAIL;
  const userPassword = process.env.PASSWORDD;
  const { cant, numbercredit, cvv, expiration, totalPagar } = req.body;
  const year = expiration.split('-')[0];
  const month = expiration.split('-')[1];
  const api = process.env.APIPAYMENT;
  const fechaActual = new Date();
  const fechaHora = fechaActual.toString();
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.connection.remoteAddress;
  try {
    const response = await fetch('https://fakepayment.onrender.com/payments', {

      method: 'POST',
      headers: {
        'Authorization': `Bearer ` + api,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: totalPagar,
        "card-number": numbercredit,
        cvv: cvv,
        "expiration-month": month,
        "expiration-year": year,
        "full-name": "APPROVED",
        currency: "USD",
        description: "pay",
        reference: "payment_id:45"
      })
    });
    const data = await response.json();
    if (data.success == true) {
      const tokenAuthorized = await promisify(jwt.verify)(req.cookies.jwt, 'token');
      const idClient = tokenAuthorized.id;

      dataBase.run(`INSERT INTO ventas(client_id,producto_id,cantidad,total_pagado,fecha,ip_client) VALUES(?,?,?,?,?,?)`, [idClient, id, cant, totalPagar, fechaHora, ip], (err, row) => {
        if (err) {
          console.log(err)
        } else {

          dataBase.get('SELECT * FROM clients WHERE id = ?', [idClient], (err, row) => {
            if (err); console.log(err);
            /*Confirmacion*/
            console.log(row)
            const transporter = nodemailer.createTransport({
              service: 'outlook',
              port: 587,
              tls: {
                ciphers: "SSLv3",
                rejectUnauthorized: false,
              },
              auth: {
                user: userEmail,
                pass: userPassword,
              },
            });

            const mailOptions = {
              from: userEmail,
              to: row.email,
              subject: '¡Confirmacion de su compra!',
              html: '<h1>¡Hola!</h1><p>Su compra ah finalizado correctamente</p>' // html body
            };

            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                console.log(error);
              } else {
                console.log('Email sent: ' + info.response);
              }
            });
          })
          res.redirect('/calificar/' + id);
        }
      })
    }
  } catch (error) {
    console.error(`Error: ${error}`);
    res.status(500).send('Hubo un error al procesar el pago');
  }
})


router.get('/calificar/:id', (req, res) => {
  const { id } = req.params;
  dataBase.get(`SELECT * FROM products WHERE id = ?`, id, (err, products) => {
    dataBase.all(`SELECT * FROM categorys`, [], (err, categorys) => {
      dataBase.get(`SELECT * FROM images WHERE producto_id = ?`, id, (err, images) => {
        res.render('calificar', {
          p: products,
          c: categorys,
          img: images
        })
      })
    })
  })
})

router.post('/calificar/:id', async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;
  const tokenAuthorized = await promisify(jwt.verify)(req.cookies.jwt, 'token');
  const idClient = tokenAuthorized.id;
  console.log('Id del cliente: ', idClient);
  console.log('Rating: ', rating);
  console.log('Id producto: ', id);
  const sql = "INSERT INTO calificacion(producto_id,user_id,rating) VALUES(?,?,?)";
  dataBase.run(sql, [id, idClient, rating], (err, row) => {
    if (err) console.log(err);
    res.redirect('/client')
  })
})



router.get('/recoverypassword', (req, res) => {
  res.render('recoverypassword');
})

router.post('/recoverypassword', (req, res) => {
  const { email } = req.body;
  const userEmail = process.env.EMAIL;
  const userPassword = process.env.PASSWORDD;
  dataBase.all(`SELECT * FROM clients WHERE email = ?`, [email], (err, row) => {
    if (row.length == 0) {
      res.send('No se encuentra el email');
    }
    else {
      const transporter = nodemailer.createTransport({
        service: 'outlook',
        port: 587,
        tls: {
          ciphers: "SSLv3",
          rejectUnauthorized: false,
        },
        auth: {
          user: userEmail,
          pass: userPassword,
        },
      });

      const mailOptions = {
        from: userEmail,
        to: email,
        subject: 'Restablecimiento de contraseña',
        html: `<h1>¡Hola!</h1><p>Correo:${email}</p><p>Contraseña:${row[0].password}`
        // html body
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
          res.send('Se le envio un correo electronico!');
        }
      });
    }
  })
}
)


router.get('/logout', logout);

module.exports = router;
