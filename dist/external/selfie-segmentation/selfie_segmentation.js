"use strict";

(function () {
  "use strict";

  function t(t) {
    var e = 0;
    return function () {
      return e < t.length ? {
        done: !1,
        value: t[e++]
      } : {
        done: !0
      };
    };
  }
  var e,
    n = "function" == typeof Object.defineProperties ? Object.defineProperty : function (t, e, n) {
      return t == Array.prototype || t == Object.prototype || (t[e] = n.value), t;
    },
    r = function t(e) {
      e = ["object" == typeof globalThis && globalThis, e, "object" == typeof window && window, "object" == typeof self && self, "object" == typeof global && global];
      for (var n = 0; n < e.length; ++n) {
        var r = e[n];
        if (r && r.Math == Math) return r;
      }
      throw Error("Cannot find global object");
    }(this);
  function i(t, e) {
    if (e) a: {
      var i = r;
      t = t.split(".");
      for (var o = 0; o < t.length - 1; o++) {
        var a = t[o];
        if (!(a in i)) break a;
        i = i[a];
      }
      (e = e(o = i[t = t[t.length - 1]])) != o && null != e && n(i, t, {
        configurable: !0,
        writable: !0,
        value: e
      });
    }
  }
  function o(t) {
    return (t = {
      next: t
    })[Symbol.iterator] = function () {
      return this;
    }, t;
  }
  function a(e) {
    var n = "undefined" != typeof Symbol && Symbol.iterator && e[Symbol.iterator];
    return n ? n.call(e) : {
      next: t(e)
    };
  }
  function u(t) {
    if (!(t instanceof Array)) {
      t = a(t);
      for (var e, n = []; !(e = t.next()).done;) n.push(e.value);
      t = n;
    }
    return t;
  }
  i("Symbol", function (t) {
    function e(t, e) {
      this.g = t, n(this, "description", {
        configurable: !0,
        writable: !0,
        value: e
      });
    }
    if (t) return t;
    e.prototype.toString = function () {
      return this.g;
    };
    var r = "jscomp_symbol_" + (1e9 * Math.random() >>> 0) + "_",
      i = 0;
    return function t(n) {
      if (this instanceof t) throw TypeError("Symbol is not a constructor");
      return new e(r + (n || "") + "_" + i++, n);
    };
  }), i("Symbol.iterator", function (e) {
    if (e) return e;
    e = Symbol("Symbol.iterator");
    for (var i = "Array Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array".split(" "), a = 0; a < i.length; a++) {
      var u = r[i[a]];
      "function" == typeof u && "function" != typeof u.prototype[e] && n(u.prototype, e, {
        configurable: !0,
        writable: !0,
        value: function () {
          return o(t(this));
        }
      });
    }
    return e;
  });
  var s,
    f,
    c = "function" == typeof Object.create ? Object.create : function (t) {
      function e() {}
      return e.prototype = t, new e();
    };
  if ("function" == typeof Object.setPrototypeOf) f = Object.setPrototypeOf;else {
    a: {
      var l = {};
      try {
        l.__proto__ = {
          a: !0
        }, R = l.a;
        break a;
      } catch (h) {}
      R = !1;
    }
    f = R ? function (t, e) {
      if (t.__proto__ = e, t.__proto__ !== e) throw TypeError(t + " is not extensible");
      return t;
    } : null;
  }
  var g = f;
  function $(t, e) {
    if (t.prototype = c(e.prototype), t.prototype.constructor = t, g) g(t, e);else for (var n in e) if ("prototype" != n) {
      if (Object.defineProperties) {
        var r = Object.getOwnPropertyDescriptor(e, n);
        r && Object.defineProperty(t, n, r);
      } else t[n] = e[n];
    }
    t.ea = e.prototype;
  }
  function p() {
    this.l = !1, this.i = null, this.h = void 0, this.g = 1, this.s = this.m = 0, this.j = null;
  }
  function v(t) {
    if (t.l) throw TypeError("Generator is already running");
    t.l = !0;
  }
  function d(t, e) {
    t.j = {
      U: e,
      V: !0
    }, t.g = t.m || t.s;
  }
  function _(t, e, n) {
    return t.g = n, {
      value: e
    };
  }
  function y(t) {
    this.g = new p(), this.h = t;
  }
  function m(t, e, n, r) {
    try {
      var i = e.call(t.g.i, n);
      if (!(i instanceof Object)) throw TypeError("Iterator result " + i + " is not an object");
      if (!i.done) return t.g.l = !1, i;
      var o = i.value;
    } catch (a) {
      return t.g.i = null, d(t.g, a), b(t);
    }
    return t.g.i = null, r.call(t.g, o), b(t);
  }
  function b(t) {
    for (; t.g.g;) try {
      var e = t.h(t.g);
      if (e) return t.g.l = !1, {
        value: e.value,
        done: !1
      };
    } catch (n) {
      t.g.h = void 0, d(t.g, n);
    }
    if (t.g.l = !1, t.g.j) {
      if (e = t.g.j, t.g.j = null, e.V) throw e.U;
      return {
        value: e.return,
        done: !0
      };
    }
    return {
      value: void 0,
      done: !0
    };
  }
  function w(t) {
    this.next = function (e) {
      return v(t.g), t.g.i ? e = m(t, t.g.i.next, e, t.g.o) : (t.g.o(e), e = b(t)), e;
    }, this.throw = function (e) {
      return v(t.g), t.g.i ? e = m(t, t.g.i.throw, e, t.g.o) : (d(t.g, e), e = b(t)), e;
    }, this.return = function (e) {
      var n, r, i;
      return n = t, r = e, v(n.g), (i = n.g.i) ? m(n, "return" in i ? i.return : function (t) {
        return {
          value: t,
          done: !0
        };
      }, r, n.g.return) : (n.g.return(r), b(n));
    }, this[Symbol.iterator] = function () {
      return this;
    };
  }
  function x(t, e) {
    return e = new w(new y(e)), g && t.prototype && g(e, t.prototype), e;
  }
  p.prototype.o = function (t) {
    this.h = t;
  }, p.prototype.return = function (t) {
    this.j = {
      return: t
    }, this.g = this.s;
  };
  var A = "function" == typeof Object.assign ? Object.assign : function (t, e) {
    for (var n = 1; n < arguments.length; n++) {
      var r = arguments[n];
      if (r) for (var i in r) Object.prototype.hasOwnProperty.call(r, i) && (t[i] = r[i]);
    }
    return t;
  };
  i("Object.assign", function (t) {
    return t || A;
  }), i("Promise", function (t) {
    function e(t) {
      this.h = 0, this.i = void 0, this.g = [], this.o = !1;
      var e = this.j();
      try {
        t(e.resolve, e.reject);
      } catch (n) {
        e.reject(n);
      }
    }
    function n() {
      this.g = null;
    }
    function i(t) {
      return t instanceof e ? t : new e(function (e) {
        e(t);
      });
    }
    if (t) return t;
    n.prototype.h = function (t) {
      if (null == this.g) {
        this.g = [];
        var e = this;
        this.i(function () {
          e.l();
        });
      }
      this.g.push(t);
    };
    var o = r.setTimeout;
    n.prototype.i = function (t) {
      o(t, 0);
    }, n.prototype.l = function () {
      for (; this.g && this.g.length;) {
        var t = this.g;
        this.g = [];
        for (var e = 0; e < t.length; ++e) {
          var n = t[e];
          t[e] = null;
          try {
            n();
          } catch (r) {
            this.j(r);
          }
        }
      }
      this.g = null;
    }, n.prototype.j = function (t) {
      this.i(function () {
        throw t;
      });
    }, e.prototype.j = function () {
      function t(t) {
        return function (r) {
          n || (n = !0, t.call(e, r));
        };
      }
      var e = this,
        n = !1;
      return {
        resolve: t(this.C),
        reject: t(this.l)
      };
    }, e.prototype.C = function (t) {
      if (t === this) this.l(TypeError("A Promise cannot resolve to itself"));else if (t instanceof e) this.F(t);else {
        a: switch (typeof t) {
          case "object":
            var n = null != t;
            break a;
          case "function":
            n = !0;
            break a;
          default:
            n = !1;
        }
        n ? this.u(t) : this.m(t);
      }
    }, e.prototype.u = function (t) {
      var e = void 0;
      try {
        e = t.then;
      } catch (n) {
        this.l(n);
        return;
      }
      "function" == typeof e ? this.G(e, t) : this.m(t);
    }, e.prototype.l = function (t) {
      this.s(2, t);
    }, e.prototype.m = function (t) {
      this.s(1, t);
    }, e.prototype.s = function (t, e) {
      if (0 != this.h) throw Error("Cannot settle(" + t + ", " + e + "): Promise already settled in state" + this.h);
      this.h = t, this.i = e, 2 === this.h && this.D(), this.A();
    }, e.prototype.D = function () {
      var t = this;
      o(function () {
        if (t.B()) {
          var e = r.console;
          void 0 !== e && e.error(t.i);
        }
      }, 1);
    }, e.prototype.B = function () {
      if (this.o) return !1;
      var t = r.CustomEvent,
        e = r.Event,
        n = r.dispatchEvent;
      return void 0 === n || ("function" == typeof t ? t = new t("unhandledrejection", {
        cancelable: !0
      }) : "function" == typeof e ? t = new e("unhandledrejection", {
        cancelable: !0
      }) : (t = r.document.createEvent("CustomEvent")).initCustomEvent("unhandledrejection", !1, !0, t), t.promise = this, t.reason = this.i, n(t));
    }, e.prototype.A = function () {
      if (null != this.g) {
        for (var t = 0; t < this.g.length; ++t) u.h(this.g[t]);
        this.g = null;
      }
    };
    var u = new n();
    return e.prototype.F = function (t) {
      var e = this.j();
      t.J(e.resolve, e.reject);
    }, e.prototype.G = function (t, e) {
      var n = this.j();
      try {
        t.call(e, n.resolve, n.reject);
      } catch (r) {
        n.reject(r);
      }
    }, e.prototype.then = function (t, n) {
      function r(t, e) {
        return "function" == typeof t ? function (e) {
          try {
            i(t(e));
          } catch (n) {
            o(n);
          }
        } : e;
      }
      var i,
        o,
        a = new e(function (t, e) {
          i = t, o = e;
        });
      return this.J(r(t, i), r(n, o)), a;
    }, e.prototype.catch = function (t) {
      return this.then(void 0, t);
    }, e.prototype.J = function (t, e) {
      function n() {
        switch (r.h) {
          case 1:
            t(r.i);
            break;
          case 2:
            e(r.i);
            break;
          default:
            throw Error("Unexpected state: " + r.h);
        }
      }
      var r = this;
      null == this.g ? u.h(n) : this.g.push(n), this.o = !0;
    }, e.resolve = i, e.reject = function (t) {
      return new e(function (e, n) {
        n(t);
      });
    }, e.race = function (t) {
      return new e(function (e, n) {
        for (var r = a(t), o = r.next(); !o.done; o = r.next()) i(o.value).J(e, n);
      });
    }, e.all = function (t) {
      var n = a(t),
        r = n.next();
      return r.done ? i([]) : new e(function (t, e) {
        function o(e) {
          return function (n) {
            a[e] = n, 0 == --u && t(a);
          };
        }
        var a = [],
          u = 0;
        do a.push(void 0), u++, i(r.value).J(o(a.length - 1), e), r = n.next(); while (!r.done);
      });
    }, e;
  }), i("Object.is", function (t) {
    return t || function (t, e) {
      return t === e ? 0 !== t || 1 / t == 1 / e : t != t && e != e;
    };
  }), i("Array.prototype.includes", function (t) {
    return t || function (t, e) {
      var n = this;
      n instanceof String && (n = String(n));
      var r = n.length;
      for (0 > (e = e || 0) && (e = Math.max(e + r, 0)); e < r; e++) {
        var i = n[e];
        if (i === t || Object.is(i, t)) return !0;
      }
      return !1;
    };
  }), i("String.prototype.includes", function (t) {
    return t || function (t, e) {
      if (null == this) throw TypeError("The 'this' value for String.prototype.includes must not be null or undefined");
      if (t instanceof RegExp) throw TypeError("First argument to String.prototype.includes must not be a regular expression");
      return -1 !== this.indexOf(t, e || 0);
    };
  }), i("Array.prototype.keys", function (t) {
    return t || function () {
      var t, e, n, r, i;
      return t = this, e = function (t) {
        return t;
      }, t instanceof String && (t += ""), n = 0, r = !1, (i = {
        next: function () {
          if (!r && n < t.length) {
            var i = n++;
            return {
              value: e(i, t[i]),
              done: !1
            };
          }
          return r = !0, {
            done: !0,
            value: void 0
          };
        }
      })[Symbol.iterator] = function () {
        return i;
      }, i;
    };
  });
  var k = this || self;
  function j(t, e) {
    t = t.split(".");
    var n,
      r = k;
    for ((t[0] in r) || void 0 === r.execScript || r.execScript("var " + t[0]); t.length && (n = t.shift());) t.length || void 0 === e ? r = r[n] && r[n] !== Object.prototype[n] ? r[n] : r[n] = {} : r[n] = e;
  }
  function F(t, e) {
    return e = String.fromCharCode.apply(null, e), null == t ? e : t + e;
  }
  var R,
    S,
    T,
    C = "undefined" != typeof TextDecoder,
    E = "undefined" != typeof TextEncoder;
  function O(t) {
    if (E) t = (T || (T = new TextEncoder())).encode(t);else {
      var e = void 0;
      e = void 0 !== e && e;
      for (var n = 0, r = new Uint8Array(3 * t.length), i = 0; i < t.length; i++) {
        var o = t.charCodeAt(i);
        if (128 > o) r[n++] = o;else {
          if (2048 > o) r[n++] = o >> 6 | 192;else {
            if (55296 <= o && 57343 >= o) {
              if (56319 >= o && i < t.length) {
                var a = t.charCodeAt(++i);
                if (56320 <= a && 57343 >= a) {
                  o = 1024 * (o - 55296) + a - 56320 + 65536, r[n++] = o >> 18 | 240, r[n++] = o >> 12 & 63 | 128, r[n++] = o >> 6 & 63 | 128, r[n++] = 63 & o | 128;
                  continue;
                }
                i--;
              }
              if (e) throw Error("Found an unpaired surrogate");
              o = 65533;
            }
            r[n++] = o >> 12 | 224, r[n++] = o >> 6 & 63 | 128;
          }
          r[n++] = 63 & o | 128;
        }
      }
      t = r.subarray(0, n);
    }
    return t;
  }
  var B = {},
    P = null;
  function L(t, e) {
    void 0 === e && (e = 0), U(), e = B[e];
    for (var n = Array(Math.floor(t.length / 3)), r = e[64] || "", i = 0, o = 0; i < t.length - 2; i += 3) {
      var a = t[i],
        u = t[i + 1],
        s = t[i + 2],
        f = e[a >> 2];
      a = e[(3 & a) << 4 | u >> 4], u = e[(15 & u) << 2 | s >> 6], s = e[63 & s], n[o++] = f + a + u + s;
    }
    switch (f = 0, s = r, t.length - i) {
      case 2:
        s = e[(15 & (f = t[i + 1])) << 2] || r;
      case 1:
        t = t[i], n[o] = e[t >> 2] + e[(3 & t) << 4 | f >> 4] + s + r;
    }
    return n.join("");
  }
  function U() {
    if (!P) {
      P = {};
      for (var t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split(""), e = ["+/=", "+/", "-_=", "-_.", "-_"], n = 0; 5 > n; n++) {
        var r = t.concat(e[n].split(""));
        B[n] = r;
        for (var i = 0; i < r.length; i++) {
          var o = r[i];
          void 0 === P[o] && (P[o] = i);
        }
      }
    }
  }
  var I,
    N = "function" == typeof Uint8Array.prototype.slice;
  function D(t, e, n) {
    return e === n ? I || (I = new Uint8Array(0)) : N ? t.slice(e, n) : new Uint8Array(t.subarray(e, n));
  }
  var M = 0,
    G = 0;
  function V(t, e) {
    e = void 0 !== (e = void 0 === e ? {} : e).v && e.v, this.h = null, this.g = this.i = this.j = 0, this.l = !1, this.v = e, t && W(this, t);
  }
  function W(t, e) {
    var n, r, i, o, a;
    e = e.constructor === Uint8Array ? e : e.constructor === ArrayBuffer ? new Uint8Array(e) : e.constructor === Array ? new Uint8Array(e) : e.constructor === String ? ((i = 3 * (r = (n = e).length) / 4) % 3 ? i = Math.floor(i) : -1 != "=.".indexOf(n[r - 1]) && (i = -1 != "=.".indexOf(n[r - 2]) ? i - 2 : i - 1), o = new Uint8Array(i), a = 0, function t(e, n) {
      function r(t) {
        for (; i < e.length;) {
          var n = e.charAt(i++),
            r = P[n];
          if (null != r) return r;
          if (!/^[\s\xa0]*$/.test(n)) throw Error("Unknown base64 encoding at char: " + n);
        }
        return t;
      }
      U();
      for (var i = 0;;) {
        var o = r(-1),
          a = r(0),
          u = r(64),
          s = r(64);
        if (64 === s && -1 === o) break;
        n(o << 2 | a >> 4), 64 != u && (n(a << 4 & 240 | u >> 2), 64 != s && n(u << 6 & 192 | s));
      }
    }(n, function (t) {
      o[a++] = t;
    }), o.subarray(0, a)) : e instanceof Uint8Array ? new Uint8Array(e.buffer, e.byteOffset, e.byteLength) : new Uint8Array(0), t.h = e, t.j = 0, t.i = t.h.length, t.g = t.j;
  }
  function z(t) {
    var e = t.h,
      n = e[t.g],
      r = 127 & n;
    return 128 > n ? (t.g += 1, r) : (r |= (127 & (n = e[t.g + 1])) << 7, 128 > n) ? (t.g += 2, r) : (r |= (127 & (n = e[t.g + 2])) << 14, 128 > n) ? (t.g += 3, r) : (r |= (127 & (n = e[t.g + 3])) << 21, 128 > n) ? (t.g += 4, r) : (r |= (15 & (n = e[t.g + 4])) << 28, 128 > n) ? (t.g += 5, r >>> 0) : (t.g += 5, 128 <= e[t.g++] && 128 <= e[t.g++] && 128 <= e[t.g++] && 128 <= e[t.g++] && t.g++, r);
  }
  function X(t) {
    var e = t.h[t.g],
      n = t.h[t.g + 1],
      r = t.h[t.g + 2],
      i = t.h[t.g + 3];
    return t.g += 4, t = 2 * ((n = (e << 0 | n << 8 | r << 16 | i << 24) >>> 0) >> 31) + 1, e = n >>> 23 & 255, n &= 8388607, 255 == e ? n ? NaN : 1 / 0 * t : 0 == e ? 1401298464324817e-60 * t * n : t * Math.pow(2, e - 150) * (n + 8388608);
  }
  V.prototype.reset = function () {
    this.g = this.j;
  };
  var Y = [];
  function H() {
    this.g = new Uint8Array(64), this.h = 0;
  }
  function J(t, e) {
    for (; 127 < e;) t.push(127 & e | 128), e >>>= 7;
    t.push(e);
  }
  function K(t) {
    var e = {},
      n = void 0 !== e.N && e.N;
    this.o = {
      v: void 0 !== e.v && e.v
    }, this.N = n, e = this.o, Y.length ? (n = Y.pop(), e && (n.v = e.v), t && W(n, t), t = n) : t = new V(t, e), this.g = t, this.m = this.g.g, this.h = this.i = this.l = -1, this.j = !1;
  }
  function Z(t) {
    var e = t.g;
    if ((e = e.g == e.i) || (e = t.j) || (e = (e = t.g).l || 0 > e.g || e.g > e.i), e) return !1;
    t.m = t.g.g;
    var n = 7 & (e = z(t.g));
    return 0 != n && 5 != n && 1 != n && 2 != n && 3 != n && 4 != n ? (t.j = !0, !1) : (t.i = e, t.l = e >>> 3, t.h = n, !0);
  }
  function q(t, e, n) {
    var r = t.g.i,
      i = z(t.g);
    return i = t.g.g + i, t.g.i = i, n(e, t), t.g.g = i, t.g.i = r, e;
  }
  function Q(t) {
    var e = z(t.g),
      n = (t = t.g).g;
    if (t.g += e, t = t.h, C) (r = S) || (r = S = new TextDecoder("utf-8", {
      fatal: !1
    })), r = r.decode(t.subarray(n, n + e));else {
      e = n + e;
      for (var r, i, o, a, u = [], s = null; n < e;) 128 > (i = t[n++]) ? u.push(i) : 224 > i ? n >= e ? u.push(65533) : (o = t[n++], 194 > i || 128 != (192 & o) ? (n--, u.push(65533)) : u.push((31 & i) << 6 | 63 & o)) : 240 > i ? n >= e - 1 ? u.push(65533) : 128 != (192 & (o = t[n++])) || 224 === i && 160 > o || 237 === i && 160 <= o || 128 != (192 & (r = t[n++])) ? (n--, u.push(65533)) : u.push((15 & i) << 12 | (63 & o) << 6 | 63 & r) : 244 >= i ? n >= e - 2 ? u.push(65533) : 128 != (192 & (o = t[n++])) || 0 != (i << 28) + (o - 144) >> 30 || 128 != (192 & (r = t[n++])) || 128 != (192 & (a = t[n++])) ? (n--, u.push(65533)) : (i = (7 & i) << 18 | (63 & o) << 12 | (63 & r) << 6 | 63 & a, i -= 65536, u.push((i >> 10 & 1023) + 55296, (1023 & i) + 56320)) : u.push(65533), 8192 <= u.length && (s = F(s, u), u.length = 0);
      r = F(s, u);
    }
    return r;
  }
  function tt() {
    this.h = [], this.i = 0, this.g = new H();
  }
  function te(t, e) {
    0 !== e.length && (t.h.push(e), t.i += e.length);
  }
  function tn(t) {
    var e = t.i + t.g.length();
    if (0 === e) return new Uint8Array(0);
    e = new Uint8Array(e);
    for (var n = t.h, r = n.length, i = 0, o = 0; o < r; o++) {
      var a = n[o];
      0 !== a.length && (e.set(a, i), i += a.length);
    }
    return 0 !== (r = (n = t.g).h) && (e.set(n.g.subarray(0, r), i), n.h = 0), t.h = [e], e;
  }
  function tr(t, e, n) {
    if (null != n) {
      J(t.g, 8 * e + 5), t = t.g;
      var r = n;
      0 === (r = (n = 0 > r ? 1 : 0) ? -r : r) ? 0 < 1 / r ? M = G = 0 : (G = 0, M = 2147483648) : isNaN(r) ? (G = 0, M = 2147483647) : 34028234663852886e22 < r ? (G = 0, M = (n << 31 | 2139095040) >>> 0) : 11754943508222875e-54 > r ? (G = 0, M = (n << 31 | (r = Math.round(r / 1401298464324817e-60))) >>> 0) : (e = Math.floor(Math.log(r) / Math.LN2), r *= Math.pow(2, -e), G = 0, M = (n << 31 | e + 127 << 23 | (r = 8388607 & Math.round(8388608 * r))) >>> 0), n = M, t.push(n >>> 0 & 255), t.push(n >>> 8 & 255), t.push(n >>> 16 & 255), t.push(n >>> 24 & 255);
    }
  }
  H.prototype.push = function (t) {
    if (!(this.h + 1 < this.g.length)) {
      var e = this.g;
      this.g = new Uint8Array(Math.ceil(1 + 2 * this.g.length)), this.g.set(e);
    }
    this.g[this.h++] = t;
  }, H.prototype.length = function () {
    return this.h;
  }, H.prototype.end = function () {
    var t = this.g,
      e = this.h;
    return this.h = 0, D(t, 0, e);
  }, K.prototype.reset = function () {
    this.g.reset(), this.h = this.l = -1;
  };
  var ti = "function" == typeof Uint8Array;
  function to(t, e, n) {
    if (null != t) return "object" == typeof t ? ti && t instanceof Uint8Array ? n(t) : ta(t, e, n) : e(t);
  }
  function ta(t, e, n) {
    if (Array.isArray(t)) {
      for (var r = Array(t.length), i = 0; i < t.length; i++) r[i] = to(t[i], e, n);
      return Array.isArray(t) && t.W && tf(r), r;
    }
    for (i in r = {}, t) r[i] = to(t[i], e, n);
    return r;
  }
  function tu(t) {
    return "number" == typeof t ? isFinite(t) ? t : String(t) : t;
  }
  var ts = {
    W: {
      value: !0,
      configurable: !0
    }
  };
  function tf(t) {
    return Array.isArray(t) && !Object.isFrozen(t) && Object.defineProperties(t, ts), t;
  }
  function tc(t, n, r) {
    var i = e;
    e = null, t || (t = i), i = this.constructor.ca, t || (t = i ? [i] : []), this.j = i ? 0 : -1, this.i = null, this.g = t;
    a: {
      if (t = (i = this.g.length) - 1, i && null !== (i = this.g[t]) && "object" == typeof i && i.constructor === Object) {
        this.l = t - this.j, this.h = i;
        break a;
      }
      void 0 !== n && -1 < n ? (this.l = Math.max(n, t + 1 - this.j), this.h = null) : this.l = Number.MAX_VALUE;
    }
    if (r) for (n = 0; n < r.length; n++) (t = r[n]) < this.l ? (t += this.j, (i = this.g[t]) ? tf(i) : this.g[t] = tl) : (th(this), (i = this.h[t]) ? tf(i) : this.h[t] = tl);
  }
  var tl = Object.freeze(tf([]));
  function th(t) {
    var e = t.l + t.j;
    t.g[e] || (t.h = t.g[e] = {});
  }
  function tg(t, e, n) {
    return -1 === e ? null : (void 0 === n ? 0 : n) || e >= t.l ? t.h ? t.h[e] : void 0 : t.g[e + t.j];
  }
  function t$(t) {
    var e = void 0 !== e && e,
      n = tg(t, 1, e);
    return null == n && (n = tl), n === tl && tv(t, 1, n = tf([]), e), n;
  }
  function tp(t, e, n) {
    return null == (t = null == (t = tg(t, e)) ? t : +t) ? void 0 === n ? 0 : n : t;
  }
  function tv(t, e, n, r) {
    (void 0 === r ? 0 : r) || e >= t.l ? (th(t), t.h[e] = n) : t.g[e + t.j] = n;
  }
  function td(t, e) {
    t.i || (t.i = {});
    var n = t.i[1];
    if (!n) {
      var r = t$(t);
      n = [];
      for (var i = 0; i < r.length; i++) n[i] = new e(r[i]);
      t.i[1] = n;
    }
    return n;
  }
  function t_(t, e, n, r) {
    var i = td(t, n);
    e = e || new n(), t = t$(t), void 0 != r ? (i.splice(r, 0, e), t.splice(r, 0, t0(e, !1))) : (i.push(e), t.push(t0(e, !1)));
  }
  function t0(t, e) {
    if (t.i) for (var n in t.i) {
      var r = t.i[n];
      if (Array.isArray(r)) for (var i = 0; i < r.length; i++) r[i] && t0(r[i], e);else r && t0(r, e);
    }
    return t.g;
  }
  function ty(t, e) {
    return null == (t = tg(t, e)) ? 0 : t;
  }
  function tm(t, e) {
    return null == (t = tg(t, e)) ? "" : t;
  }
  function tb(t, e) {
    if (t = t.m) {
      te(e, e.g.end());
      for (var n = 0; n < t.length; n++) te(e, t[n]);
    }
  }
  function tw(t, e) {
    if (4 == e.h) return !1;
    var n = e.m;
    return !function t(e) {
      switch (e.h) {
        case 0:
          if (0 != e.h) t(e);else {
            for (e = e.g; 128 & e.h[e.g];) e.g++;
            e.g++;
          }
          break;
        case 1:
          1 != e.h ? t(e) : (e = e.g, e.g += 8);
          break;
        case 2:
          if (2 != e.h) t(e);else {
            var n = z(e.g);
            e = e.g, e.g += n;
          }
          break;
        case 5:
          5 != e.h ? t(e) : (e = e.g, e.g += 4);
          break;
        case 3:
          for (n = e.l;;) {
            if (!Z(e)) {
              e.j = !0;
              break;
            }
            if (4 == e.h) {
              e.l != n && (e.j = !0);
              break;
            }
            t(e);
          }
          break;
        default:
          e.j = !0;
      }
    }(e), e.N || (e = D(e.g.h, n, e.g.g), (n = t.m) ? n.push(e) : t.m = [e]), !0;
  }
  function t1(t, e) {
    var n = void 0;
    return new (n || (n = Promise))(function (r, i) {
      function o(t) {
        try {
          u(e.next(t));
        } catch (n) {
          i(n);
        }
      }
      function a(t) {
        try {
          u(e.throw(t));
        } catch (n) {
          i(n);
        }
      }
      function u(t) {
        t.done ? r(t.value) : new n(function (e) {
          e(t.value);
        }).then(o, a);
      }
      u((e = e.apply(t, void 0)).next());
    });
  }
  function t2(t) {
    tc.call(this, t);
  }
  function tx(t, e) {
    for (; Z(e);) switch (e.i) {
      case 8:
        var n = z(e.g);
        tv(t, 1, n);
        break;
      case 21:
        tv(t, 2, n = X(e.g));
        break;
      case 26:
        tv(t, 3, n = Q(e));
        break;
      case 34:
        tv(t, 4, n = Q(e));
        break;
      default:
        if (!tw(t, e)) return t;
    }
    return t;
  }
  function tA(t) {
    tc.call(this, t, -1, t4);
  }
  tc.prototype.toJSON = function () {
    return ta(t0(this, !1), tu, L);
  }, tc.prototype.toString = function () {
    return t0(this, !1).toString();
  }, $(t2, tc), $(tA, tc), tA.prototype.addClassification = function (t, e) {
    t_(this, t, t2, e);
  };
  var t4 = [1];
  function t6(t) {
    tc.call(this, t);
  }
  function t3(t, e) {
    for (; Z(e);) switch (e.i) {
      case 13:
        var n = X(e.g);
        tv(t, 1, n);
        break;
      case 21:
        tv(t, 2, n = X(e.g));
        break;
      case 29:
        tv(t, 3, n = X(e.g));
        break;
      case 37:
        tv(t, 4, n = X(e.g));
        break;
      case 45:
        tv(t, 5, n = X(e.g));
        break;
      default:
        if (!tw(t, e)) return t;
    }
    return t;
  }
  function tk(t) {
    tc.call(this, t, -1, tj);
  }
  $(t6, tc), $(tk, tc);
  var tj = [1];
  function t8(t) {
    tc.call(this, t);
  }
  function tF(t, e, n) {
    if (n = t.createShader(0 === n ? t.VERTEX_SHADER : t.FRAGMENT_SHADER), t.shaderSource(n, e), t.compileShader(n), !t.getShaderParameter(n, t.COMPILE_STATUS)) throw Error("Could not compile WebGL shader.\n\n" + t.getShaderInfoLog(n));
    return n;
  }
  function tR(t) {
    return td(t, t2).map(function (t) {
      return {
        index: ty(t, 1),
        Y: tp(t, 2),
        label: null != tg(t, 3) ? tm(t, 3) : void 0,
        displayName: null != tg(t, 4) ? tm(t, 4) : void 0
      };
    });
  }
  function tS(t) {
    return {
      x: tp(t, 1),
      y: tp(t, 2),
      z: tp(t, 3),
      visibility: null != tg(t, 4) ? tp(t, 4) : void 0
    };
  }
  function t5(t, e) {
    this.h = t, this.g = e, this.l = 0;
  }
  function tT(t, e, n) {
    return (function t(e, n) {
      var r = e.g;
      if (void 0 === e.m) {
        var i = tF(r, "\n  attribute vec2 aVertex;\n  attribute vec2 aTex;\n  varying vec2 vTex;\n  void main(void) {\n    gl_Position = vec4(aVertex, 0.0, 1.0);\n    vTex = aTex;\n  }", 0),
          o = tF(r, "\n  precision mediump float;\n  varying vec2 vTex;\n  uniform sampler2D sampler0;\n  void main(){\n    gl_FragColor = texture2D(sampler0, vTex);\n  }", 1),
          a = r.createProgram();
        if (r.attachShader(a, i), r.attachShader(a, o), r.linkProgram(a), !r.getProgramParameter(a, r.LINK_STATUS)) throw Error("Could not compile WebGL program.\n\n" + r.getProgramInfoLog(a));
        i = e.m = a, r.useProgram(i), o = r.getUniformLocation(i, "sampler0"), e.j = {
          I: r.getAttribLocation(i, "aVertex"),
          H: r.getAttribLocation(i, "aTex"),
          da: o
        }, e.s = r.createBuffer(), r.bindBuffer(r.ARRAY_BUFFER, e.s), r.enableVertexAttribArray(e.j.I), r.vertexAttribPointer(e.j.I, 2, r.FLOAT, !1, 0, 0), r.bufferData(r.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), r.STATIC_DRAW), r.bindBuffer(r.ARRAY_BUFFER, null), e.o = r.createBuffer(), r.bindBuffer(r.ARRAY_BUFFER, e.o), r.enableVertexAttribArray(e.j.H), r.vertexAttribPointer(e.j.H, 2, r.FLOAT, !1, 0, 0), r.bufferData(r.ARRAY_BUFFER, new Float32Array([0, 1, 0, 0, 1, 0, 1, 1]), r.STATIC_DRAW), r.bindBuffer(r.ARRAY_BUFFER, null), r.uniform1i(o, 0);
      }
      i = e.j, r.useProgram(e.m), r.canvas.width = n.width, r.canvas.height = n.height, r.viewport(0, 0, n.width, n.height), r.activeTexture(r.TEXTURE0), e.h.bindTexture2d(n.glName), r.enableVertexAttribArray(i.I), r.bindBuffer(r.ARRAY_BUFFER, e.s), r.vertexAttribPointer(i.I, 2, r.FLOAT, !1, 0, 0), r.enableVertexAttribArray(i.H), r.bindBuffer(r.ARRAY_BUFFER, e.o), r.vertexAttribPointer(i.H, 2, r.FLOAT, !1, 0, 0), r.bindFramebuffer(r.DRAW_FRAMEBUFFER ? r.DRAW_FRAMEBUFFER : r.FRAMEBUFFER, null), r.clearColor(0, 0, 0, 0), r.clear(r.COLOR_BUFFER_BIT), r.colorMask(!0, !0, !0, !0), r.drawArrays(r.TRIANGLE_FAN, 0, 4), r.disableVertexAttribArray(i.I), r.disableVertexAttribArray(i.H), r.bindBuffer(r.ARRAY_BUFFER, null), e.h.bindTexture2d(0);
    }(t, e), "function" == typeof t.g.canvas.transferToImageBitmap) ? Promise.resolve(t.g.canvas.transferToImageBitmap()) : n ? Promise.resolve(t.g.canvas) : "function" == typeof createImageBitmap ? createImageBitmap(t.g.canvas) : (void 0 === t.i && (t.i = document.createElement("canvas")), new Promise(function (e) {
      t.i.height = t.g.canvas.height, t.i.width = t.g.canvas.width, t.i.getContext("2d", {}).drawImage(t.g.canvas, 0, 0, t.g.canvas.width, t.g.canvas.height), e(t.i);
    }));
  }
  function tC(t) {
    this.g = t;
  }
  $(t8, tc);
  var tE = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 9, 1, 7, 0, 65, 0, 253, 15, 26, 11]);
  function tO(t, e) {
    return e + t;
  }
  function tB(t, e) {
    window[t] = e;
  }
  function tP(t) {
    if (this.g = t, this.listeners = {}, this.j = {}, this.F = {}, this.m = {}, this.s = {}, this.G = this.o = this.R = !0, this.C = Promise.resolve(), this.P = "", this.B = {}, this.locateFile = t && t.locateFile || tO, "object" == typeof window) var e = window.location.pathname.toString().substring(0, window.location.pathname.toString().lastIndexOf("/")) + "/";else if ("undefined" != typeof location) e = location.pathname.toString().substring(0, location.pathname.toString().lastIndexOf("/")) + "/";else throw Error("solutions can only be loaded on a web page or in a web worker");
    if (this.S = e, t.options) {
      e = a(Object.keys(t.options));
      for (var n = e.next(); !n.done; n = e.next()) {
        n = n.value;
        var r = t.options[n].default;
        void 0 !== r && (this.j[n] = "function" == typeof r ? r() : r);
      }
    }
  }
  function tL(t, e) {
    return t1(t, function t() {
      var n,
        r,
        i = this;
      return x(t, function (t) {
        return e in i.F ? t.return(i.F[e]) : (r = fetch(n = i.locateFile(e, "")).then(function (t) {
          return t.arrayBuffer();
        }), i.F[e] = r, t.return(r));
      });
    });
  }
  function t7(t, e) {
    for (var n = e.name || "$", r = [].concat(u(e.wants)), i = new t.h.StringList(), o = a(e.wants), s = o.next(); !s.done; s = o.next()) i.push_back(s.value);
    o = t.h.PacketListener.implement({
      onResults: function (i) {
        for (var o = {}, u = 0; u < e.wants.length; ++u) o[r[u]] = i.get(u);
        var s,
          f,
          c,
          l = t.listeners[n];
        l && (t.C = (s = t, f = o, c = e.outs, t1(s, function t() {
          var e,
            n,
            r,
            i,
            o,
            u,
            s,
            l,
            h,
            g,
            $,
            p,
            v,
            d,
            y = this;
          return x(t, function (t) {
            switch (t.g) {
              case 1:
                if (!c) return t.return(f);
                for (e = {}, n = 0, i = (r = a(Object.keys(c))).next(); !i.done; i = r.next()) "string" != typeof (u = c[o = i.value]) && "texture" === u.type && void 0 !== f[u.stream] && ++n;
                1 < n && (y.G = !1), i = (s = a(Object.keys(c))).next();
              case 2:
                if (i.done) {
                  t.g = 4;
                  break;
                }
                if ("string" == typeof (h = c[l = i.value])) {
                  var m, b, w;
                  return v = e, d = l, _(t, (m = y, b = l, w = f[h], t1(m, function t() {
                    var e,
                      n = this;
                    return x(t, function (t) {
                      return "number" == typeof w || w instanceof Uint8Array || w instanceof n.h.Uint8BlobList ? t.return(w) : w instanceof n.h.Texture2dDataOut ? ((e = n.s[b]) || (e = new t5(n.h, n.D), n.s[b] = e), t.return(tT(e, w, n.G))) : t.return(void 0);
                    });
                  })), 14);
                }
                if (g = f[h.stream], "detection_list" === h.type) {
                  if (g) {
                    for (var A = g.getRectList(), k = g.getLandmarksList(), j = g.getClassificationsList(), F = [], R = 0; R < A.size(); ++R) {
                      var S = A.get(R);
                      a: {
                        var T = new t8();
                        for (S = new K(S); Z(S);) switch (S.i) {
                          case 13:
                            var C = X(S.g);
                            tv(T, 1, C);
                            break;
                          case 21:
                            tv(T, 2, C = X(S.g));
                            break;
                          case 29:
                            tv(T, 3, C = X(S.g));
                            break;
                          case 37:
                            tv(T, 4, C = X(S.g));
                            break;
                          case 45:
                            tv(T, 5, C = X(S.g));
                            break;
                          case 48:
                            for (var E = S.g, O = 128, B = 0, P = C = 0; 4 > P && 128 <= O; P++) B |= (127 & (O = E.h[E.g++])) << 7 * P;
                            if (128 <= O && (B |= (127 & (O = E.h[E.g++])) << 28, C |= (127 & O) >> 4), 128 <= O) for (P = 0; 5 > P && 128 <= O; P++) C |= (127 & (O = E.h[E.g++])) << 7 * P + 3;
                            128 > O ? (E = B >>> 0, (C = 2147483648 & (O = C >>> 0)) && (O = ~O >>> 0, 0 == (E = ~E + 1 >>> 0) && (O = O + 1 >>> 0)), E = 4294967296 * O + (E >>> 0), C = C ? -E : E) : (E.l = !0, C = void 0), tv(T, 6, C);
                            break;
                          default:
                            if (!tw(T, S)) break a;
                        }
                      }
                      T = {
                        Z: tp(T, 1),
                        $: tp(T, 2),
                        height: tp(T, 3),
                        width: tp(T, 4),
                        rotation: tp(T, 5, 0),
                        X: ty(T, 6)
                      }, C = k.get(R);
                      a: for (S = new tk(), C = new K(C); Z(C);) if (10 === C.i) t_(S, E = q(C, new t6(), t3), t6, void 0);else if (!tw(S, C)) break a;
                      S = td(S, t6).map(tS), E = j.get(R);
                      a: for (C = new tA(), E = new K(E); Z(E);) if (10 === E.i) C.addClassification(q(E, new t2(), tx));else if (!tw(C, E)) break a;
                      T = {
                        T: T,
                        O: S,
                        M: tR(C)
                      }, F.push(T);
                    }
                    A = F;
                  } else A = [];
                  e[l] = A, t.g = 7;
                  break;
                }
                if ("proto_list" === h.type) {
                  if (g) {
                    for (k = 0, A = Array(g.size()); k < g.size(); k++) A[k] = g.get(k);
                    g.delete();
                  } else A = [];
                  e[l] = A, t.g = 7;
                  break;
                }
                if (void 0 === g) {
                  t.g = 3;
                  break;
                }
                if ("float_list" === h.type || "proto" === h.type) {
                  e[l] = g, t.g = 7;
                  break;
                }
                if ("texture" !== h.type) throw Error("Unknown output config type: '" + h.type + "'");
                return ($ = y.s[l]) || ($ = new t5(y.h, y.D), y.s[l] = $), _(t, tT($, g, y.G), 13);
              case 13:
                p = t.h, e[l] = p;
              case 7:
                h.transform && e[l] && (e[l] = h.transform(e[l])), t.g = 3;
                break;
              case 14:
                v[d] = t.h;
              case 3:
                i = s.next(), t.g = 2;
                break;
              case 4:
                return t.return(e);
            }
          });
        })).then(function (n) {
          n = l(n);
          for (var i = 0; i < e.wants.length; ++i) {
            var a = o[r[i]];
            "object" == typeof a && a.hasOwnProperty && a.hasOwnProperty("delete") && a.delete();
          }
          n && (t.C = n);
        }));
      }
    }), t.i.attachMultiListener(i, o), i.delete();
  }
  function tU(t) {
    return (void 0 === t && (t = 0), 1 === t) ? "selfie_segmentation_landscape.tflite" : "selfie_segmentation.tflite";
  }
  function tI(t) {
    var e = this;
    t = t || {}, this.g = new tP({
      locateFile: t.locateFile,
      files: function (t) {
        return [{
          simd: !0,
          url: "selfie_segmentation_solution_simd_wasm_bin.js"
        }, {
          simd: !1,
          url: "selfie_segmentation_solution_wasm_bin.js"
        }, {
          data: !0,
          url: tU(t.modelSelection)
        }];
      },
      graph: {
        url: "selfie_segmentation.binarypb"
      },
      listeners: [{
        wants: ["segmentation_mask", "image_transformed"],
        outs: {
          image: {
            type: "texture",
            stream: "image_transformed"
          },
          segmentationMask: {
            type: "texture",
            stream: "segmentation_mask"
          }
        }
      }],
      inputs: {
        image: {
          type: "video",
          stream: "input_frames_gpu"
        }
      },
      options: {
        useCpuInference: {
          type: 0,
          graphOptionXref: {
            calculatorType: "InferenceCalculator",
            fieldName: "use_cpu_inference"
          },
          default: "iPad Simulator;iPhone Simulator;iPod Simulator;iPad;iPhone;iPod".split(";").includes(navigator.platform) || navigator.userAgent.includes("Mac") && "ontouchend" in document
        },
        selfieMode: {
          type: 0,
          graphOptionXref: {
            calculatorType: "GlScalerCalculator",
            calculatorIndex: 1,
            fieldName: "flip_horizontal"
          }
        },
        modelSelection: {
          type: 1,
          graphOptionXref: {
            calculatorType: "ConstantSidePacketCalculator",
            calculatorName: "ConstantSidePacketCalculatorModelSelection",
            fieldName: "int_value"
          },
          onChange: function (t) {
            return t1(e, function e() {
              var n,
                r,
                i,
                o = this;
              return x(e, function (e) {
                return 1 == e.g ? (r = "third_party/mediapipe/modules/selfie_segmentation/" + (n = tU(t)), _(e, tL(o.g, n), 2)) : (i = e.h, o.g.overrideFile(r, i), e.return(!0));
              });
            });
          }
        }
      }
    });
  }
  (s = tP.prototype).close = function () {
    return this.i && this.i.delete(), Promise.resolve();
  }, s.reset = function () {
    return t1(this, function t() {
      var e = this;
      return x(t, function (t) {
        e.i && (e.i.reset(), e.m = {}, e.s = {}), t.g = 0;
      });
    });
  }, s.setOptions = function (t, e) {
    var n = this;
    if (e = e || this.g.options) {
      for (var r = [], i = [], o = {}, u = a(Object.keys(t)), s = u.next(); !s.done; o = {
        K: o.K,
        L: o.L
      }, s = u.next()) {
        var f = s.value;
        f in this.j && this.j[f] === t[f] || (this.j[f] = t[f], void 0 !== (s = e[f]) && (s.onChange && (o.K = s.onChange, o.L = t[f], r.push(function (t) {
          return function () {
            return t1(n, function e() {
              var n,
                r = this;
              return x(e, function (e) {
                if (1 == e.g) return _(e, t.K(t.L), 2);
                !0 === (n = e.h) && (r.o = !0), e.g = 0;
              });
            });
          };
        }(o))), s.graphOptionXref && (f = {
          valueNumber: 1 === s.type ? t[f] : 0,
          valueBoolean: 0 === s.type && t[f],
          valueString: 2 === s.type ? t[f] : ""
        }, s = Object.assign(Object.assign(Object.assign({}, {
          calculatorName: "",
          calculatorIndex: 0
        }), s.graphOptionXref), f), i.push(s))));
      }
      (0 !== r.length || 0 !== i.length) && (this.o = !0, this.A = (void 0 === this.A ? [] : this.A).concat(i), this.u = (void 0 === this.u ? [] : this.u).concat(r));
    }
  }, s.initialize = function () {
    return t1(this, function t() {
      var e = this;
      return x(t, function (t) {
        var n, r, i;
        return 1 == t.g ? _(t, t1(n = e, function t() {
          var e,
            n,
            r,
            i,
            o,
            a,
            s,
            f,
            c,
            l,
            h,
            g = this;
          return x(t, function (t) {
            switch (t.g) {
              case 1:
                var $, p;
                if (e = g, !g.R) return t.return();
                return n = ($ = g, p = g.j, void 0 === $.g.files ? [] : "function" == typeof $.g.files ? $.g.files(p) : $.g.files), _(t, function t() {
                  return t1(this, function t() {
                    return x(t, function (t) {
                      switch (t.g) {
                        case 1:
                          return t.m = 2, _(t, WebAssembly.instantiate(tE), 4);
                        case 4:
                          t.g = 3, t.m = 0;
                          break;
                        case 2:
                          return t.m = 0, t.j = null, t.return(!1);
                        case 3:
                          return t.return(!0);
                      }
                    });
                  });
                }(), 2);
              case 2:
                if (r = t.h, "object" == typeof window) return tB("createMediapipeSolutionsWasm", {
                  locateFile: g.locateFile
                }), tB("createMediapipeSolutionsPackedAssets", {
                  locateFile: g.locateFile
                }), a = n.filter(function (t) {
                  return void 0 !== t.data;
                }), s = n.filter(function (t) {
                  return void 0 === t.data;
                }), f = Promise.all(a.map(function (t) {
                  var n = tL(e, t.url);
                  if (void 0 !== t.path) {
                    var r = t.path;
                    n = n.then(function (t) {
                      return e.overrideFile(r, t), Promise.resolve(t);
                    });
                  }
                  return n;
                })), c = Promise.all(s.map(function (t) {
                  var n, i;
                  return void 0 === t.simd || t.simd && r || !t.simd && !r ? (n = e.locateFile(t.url, e.S), (i = document.createElement("script")).setAttribute("src", n), i.setAttribute("lang", "text/javascript"), i.setAttribute("crossorigin", "anonymous"), new Promise(function (t) {
                    i.addEventListener("load", function () {
                      t();
                    }, !1), i.addEventListener("error", function () {
                      t();
                    }, !1), document.body.appendChild(i);
                  })) : Promise.resolve();
                })).then(function () {
                  return t1(e, function t() {
                    var e,
                      n,
                      r = this;
                    return x(t, function (t) {
                      if (1 == t.g) return _(t, (e = window.createMediapipeSolutionsWasm)(n = window.createMediapipeSolutionsPackedAssets), 2);
                      r.h = t.h, t.g = 0;
                    });
                  });
                }), l = t1(e, function t() {
                  var e = this;
                  return x(t, function (t) {
                    return e.g.graph && e.g.graph.url ? t = _(t, tL(e, e.g.graph.url), 0) : (t.g = 0, t = void 0), t;
                  });
                }), _(t, Promise.all([c, f, l]), 7);
                if ("function" != typeof importScripts) throw Error("solutions can only be loaded on a web page or in a web worker");
                return i = n.filter(function (t) {
                  return void 0 === t.simd || t.simd && r || !t.simd && !r;
                }).map(function (t) {
                  return e.locateFile(t.url, e.S);
                }), importScripts.apply(null, u(i)), _(t, createMediapipeSolutionsWasm(Module), 6);
              case 6:
                g.h = t.h, g.l = new OffscreenCanvas(1, 1), g.h.canvas = g.l, o = g.h.GL.createContext(g.l, {
                  antialias: !1,
                  alpha: !1,
                  ba: "undefined" != typeof WebGL2RenderingContext ? 2 : 1
                }), g.h.GL.makeContextCurrent(o), t.g = 4;
                break;
              case 7:
                if (g.l = document.createElement("canvas"), !(h = g.l.getContext("webgl2", {})) && !(h = g.l.getContext("webgl", {}))) return alert("Failed to create WebGL canvas context when passing video frame."), t.return();
                g.D = h, g.h.canvas = g.l, g.h.createContext(g.l, !0, !0, {});
              case 4:
                g.i = new g.h.SolutionWasm(), g.R = !1, t.g = 0;
            }
          });
        }), 2) : 3 != t.g ? _(t, t1(r = e, function t() {
          var e,
            n,
            r,
            i,
            o,
            u,
            s,
            f,
            c = this;
          return x(t, function (t) {
            if (1 == t.g) {
              if (c.g.graph && c.g.graph.url && c.P === c.g.graph.url) return t.return();
              if (c.o = !0, !c.g.graph || !c.g.graph.url) {
                t.g = 2;
                return;
              }
              return c.P = c.g.graph.url, _(t, tL(c, c.g.graph.url), 3);
            }
            for (2 != t.g && (e = t.h, c.i.loadGraph(e)), r = (n = a(Object.keys(c.B))).next(); !r.done; r = n.next()) i = r.value, c.i.overrideFile(i, c.B[i]);
            if (c.B = {}, c.g.listeners) for (u = (o = a(c.g.listeners)).next(); !u.done; u = o.next()) t7(c, s = u.value);
            f = c.j, c.j = {}, c.setOptions(f), t.g = 0;
          });
        }), 3) : _(t, t1(i = e, function t() {
          var e,
            n,
            r,
            i,
            o,
            u,
            s,
            f = this;
          return x(t, function (t) {
            switch (t.g) {
              case 1:
                if (!f.o) return t.return();
                if (!f.u) {
                  t.g = 2;
                  break;
                }
                n = (e = a(f.u)).next();
              case 3:
                if (n.done) {
                  t.g = 5;
                  break;
                }
                return _(t, (r = n.value)(), 4);
              case 4:
                n = e.next(), t.g = 3;
                break;
              case 5:
                f.u = void 0;
              case 2:
                if (f.A) {
                  for (i = new f.h.GraphOptionChangeRequestList(), u = (o = a(f.A)).next(); !u.done; u = o.next()) s = u.value, i.push_back(s);
                  f.i.changeOptions(i), i.delete(), f.A = void 0;
                }
                f.o = !1, t.g = 0;
            }
          });
        }), 0);
      });
    });
  }, s.overrideFile = function (t, e) {
    this.i ? this.i.overrideFile(t, e) : this.B[t] = e;
  }, s.clearOverriddenFiles = function () {
    this.B = {}, this.i && this.i.clearOverriddenFiles();
  }, s.send = function (t, e) {
    return t1(this, function n() {
      var r,
        i,
        o,
        u,
        s,
        f,
        c,
        l,
        h,
        g = this;
      return x(n, function (n) {
        switch (n.g) {
          case 1:
            if (!g.g.inputs) return n.return();
            return r = 1e3 * (null == e ? performance.now() : e), _(n, g.C, 2);
          case 2:
            return _(n, g.initialize(), 3);
          case 3:
            for (i = new g.h.PacketDataList(), u = (o = a(Object.keys(t))).next(); !u.done; u = o.next()) if (s = u.value, f = g.g.inputs[s]) {
              a: {
                var $ = g,
                  p = t[s];
                switch (f.type) {
                  case "video":
                    var v = $.m[f.stream];
                    if (v || (v = new t5($.h, $.D), $.m[f.stream] = v), 0 === ($ = v).l && ($.l = $.h.createTexture()), "undefined" != typeof HTMLVideoElement && p instanceof HTMLVideoElement) {
                      var d = p.videoWidth;
                      v = p.videoHeight;
                    } else "undefined" != typeof HTMLImageElement && p instanceof HTMLImageElement ? (d = p.naturalWidth, v = p.naturalHeight) : (d = p.width, v = p.height);
                    v = {
                      glName: $.l,
                      width: d,
                      height: v
                    }, (d = $.g).canvas.width = v.width, d.canvas.height = v.height, d.activeTexture(d.TEXTURE0), $.h.bindTexture2d($.l), d.texImage2D(d.TEXTURE_2D, 0, d.RGBA, d.RGBA, d.UNSIGNED_BYTE, p), $.h.bindTexture2d(0), $ = v;
                    break a;
                  case "detections":
                    for ((v = $.m[f.stream]) || (v = new tC($.h), $.m[f.stream] = v), ($ = v).data || ($.data = new $.g.DetectionListData()), $.data.reset(p.length), v = 0; v < p.length; ++v) {
                      d = p[v];
                      var y = $.data,
                        m = y.setBoundingBox,
                        b = v,
                        w = d.T,
                        x = new t8();
                      tv(x, 1, w.Z), tv(x, 2, w.$), tv(x, 3, w.height), tv(x, 4, w.width), tv(x, 5, w.rotation), tv(x, 6, w.X);
                      var A = w = new tt();
                      tr(A, 1, tg(x, 1)), tr(A, 2, tg(x, 2)), tr(A, 3, tg(x, 3)), tr(A, 4, tg(x, 4)), tr(A, 5, tg(x, 5));
                      var k = tg(x, 6);
                      if (null != k && null != k) {
                        J(A.g, 48);
                        var j = A.g,
                          F = k;
                        k = 0 > F;
                        var R = (F = Math.abs(F)) >>> 0;
                        for (F = Math.floor((F - R) / 4294967296), F >>>= 0, k && (F = ~F >>> 0, 4294967295 < (R = (~R >>> 0) + 1) && (R = 0, 4294967295 < ++F && (F = 0))), M = R, G = F, k = M, R = G; 0 < R || 127 < k;) j.push(127 & k | 128), k = (k >>> 7 | R << 25) >>> 0, R >>>= 7;
                        j.push(k);
                      }
                      if (tb(x, A), w = tn(w), m.call(y, b, w), d.O) for (y = 0; y < d.O.length; ++y) A = !!(x = d.O[y]).visibility, b = (m = $.data).addNormalizedLandmark, w = v, x = Object.assign(Object.assign({}, x), {
                        visibility: A ? x.visibility : 0
                      }), tv(A = new t6(), 1, x.x), tv(A, 2, x.y), tv(A, 3, x.z), x.visibility && tv(A, 4, x.visibility), tr(j = x = new tt(), 1, tg(A, 1)), tr(j, 2, tg(A, 2)), tr(j, 3, tg(A, 3)), tr(j, 4, tg(A, 4)), tr(j, 5, tg(A, 5)), tb(A, j), x = tn(x), b.call(m, w, x);
                      if (d.M) for (y = 0; y < d.M.length; ++y) {
                        if (b = (m = $.data).addClassification, w = v, x = d.M[y], tv(A = new t2(), 2, x.Y), x.index && tv(A, 1, x.index), x.label && tv(A, 3, x.label), x.displayName && tv(A, 4, x.displayName), j = x = new tt(), null != (R = tg(A, 1)) && null != R) {
                          if (J(j.g, 8), k = j.g, 0 <= R) J(k, R);else {
                            for (F = 0; 9 > F; F++) k.push(127 & R | 128), R >>= 7;
                            k.push(1);
                          }
                        }
                        tr(j, 2, tg(A, 2)), null != (k = tg(A, 3)) && (k = O(k), J(j.g, 26), J(j.g, k.length), te(j, j.g.end()), te(j, k)), null != (k = tg(A, 4)) && (k = O(k), J(j.g, 34), J(j.g, k.length), te(j, j.g.end()), te(j, k)), tb(A, j), x = tn(x), b.call(m, w, x);
                      }
                    }
                    $ = $.data;
                    break a;
                  default:
                    $ = {};
                }
              }
              switch (c = $, l = f.stream, f.type) {
                case "video":
                  i.pushTexture2d(Object.assign(Object.assign({}, c), {
                    stream: l,
                    timestamp: r
                  }));
                  break;
                case "detections":
                  (h = c).stream = l, h.timestamp = r, i.pushDetectionList(h);
                  break;
                default:
                  throw Error("Unknown input config type: '" + f.type + "'");
              }
            }
            return g.i.send(i), _(n, g.C, 4);
          case 4:
            i.delete(), n.g = 0;
        }
      });
    });
  }, s.onResults = function (t, e) {
    this.listeners[e || "$"] = t;
  }, j("Solution", tP), j("OptionType", {
    BOOL: 0,
    NUMBER: 1,
    aa: 2,
    0: "BOOL",
    1: "NUMBER",
    2: "STRING"
  }), (s = tI.prototype).close = function () {
    return this.g.close(), Promise.resolve();
  }, s.onResults = function (t) {
    this.g.onResults(t);
  }, s.initialize = function () {
    return t1(this, function t() {
      var e = this;
      return x(t, function (t) {
        return _(t, e.g.initialize(), 0);
      });
    });
  }, s.reset = function () {
    this.g.reset();
  }, s.send = function (t) {
    return t1(this, function e() {
      var n = this;
      return x(e, function (e) {
        return _(e, n.g.send(t), 0);
      });
    });
  }, s.setOptions = function (t) {
    this.g.setOptions(t);
  }, j("SelfieSegmentation", tI), j("VERSION", "0.1.1632777926");
}).call(void 0);