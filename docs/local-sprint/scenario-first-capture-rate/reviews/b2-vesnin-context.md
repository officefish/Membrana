# b2 context — vesnin

The reusable Web Audio guard belongs near `createAudioContext`: callers can request 48000 Hz, but the browser may return another actual rate. The urgent need is a synchronous preflight immediately after construction and before any graph source or recorder can accept samples.
