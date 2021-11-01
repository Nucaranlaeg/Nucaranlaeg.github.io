const svgStart = `<svg
xmlns:dc="http://purl.org/dc/elements/1.1/"
xmlns:cc="http://creativecommons.org/ns#"
xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
xmlns:svg="http://www.w3.org/2000/svg"
xmlns="http://www.w3.org/2000/svg"
width="14"
height="14"
viewBox="0 0 100 100"
version="1.1"><g>`;
const svgEnd = `</g></svg>`;

const upArrowSVG = svgStart + `<path
style="fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.195532px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1"
d="M 75.685627,99.4946 75.347197,54.404488 99.797843,64.146031 48.867133,-0.04885298 0.40663777,64.892147 23.207155,54.795838 l 0.33843,45.09011 z"
sodipodi:nodetypes="cccccccc" />` + svgEnd;
const downArrowSVG = svgStart + `<path
style="fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.195532px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1"
d="M 24.679697,0.09776622 V 45.189149 L 0.30285443,35.264368 50.75032,99.839696 99.69686,35.264246 76.821208,45.189143 V 0.09776622 Z"
sodipodi:nodetypes="cccccccc" />` + svgEnd;
const leftArrowSVG = svgStart + `<path
style="fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.195532px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1"
d="M 99.710792,24.30587 54.62068,24.6443 64.362223,0.19365396 0.16734307,51.124364 65.108339,99.584859 55.01203,76.784342 l 45.09011,-0.33843 z"
sodipodi:nodetypes="cccccccc" />` + svgEnd;
const rightArrowSVG = svgStart + `<path
style="fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.195532px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1"
d="M 0.49689686,75.469431 45.587009,75.131001 35.845466,99.581647 100.04035,48.650937 35.09935,0.19044171 45.195659,22.990959 0.10554886,23.329389 Z"
sodipodi:nodetypes="cccccccc" />` + svgEnd;
const interactSVG = svgStart + `<ellipse
style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:24.8532;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
cx="50.000019"
cy="50.000023"
rx="37.573391"
ry="37.573414" />` + svgEnd;
const hammerSVG = svgStart.replace(/"14"/g, '"22"') + `<path
style="fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:1.70587;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
d="M 91.9799,91.807365 18.079698,16.036452 25.563263,8.5529065 101.33436,82.452928 Z"
sodipodi:nodetypes="ccccc" />
<rect
style="fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:1.02885;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
width="24.971128"
height="13.971112"
x="22.162033"
y="7.162077"
transform="matrix(0.70710772,0.70710584,-0.70710756,0.70710601,0,0)" />
<path
style="fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:1;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
d="M 18.115658,40.012506 8.6448037,30.806257 21.500632,17.265495 C 34.342634,4.4235229 48.2233,-2.5167945 52.503969,1.763861 L 62.503992,11.763863 C 58.223325,7.4832065 44.342658,14.423523 31.500655,27.265494 Z"
sodipodi:nodetypes="ccccccc" />` + svgEnd;
const repeatInteractSVG = svgStart.replace("0 0 100 100", "-10 -10 120 120") + `<ellipse
style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:20;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
cx="50.000019"
cy="50.000023"
rx="37.573391"
ry="37.573414" />
<rect
style="fill:#000000;stroke:#000000;stroke-width:10;stroke-miterlimit:4;stroke-dasharray:none"
width="32.915249"
height="1.9515609"
x="15.293995"
y="34.624523"
transform="rotate(-45)" />
<rect
style="fill:#000000;stroke:#000000;stroke-width:10;stroke-miterlimit:4;stroke-dasharray:none"
width="32.915249"
height="1.9515609"
x="34.624523"
y="-17.245558"
transform="rotate(45)" />
<rect
style="fill:#000000;stroke:#000000;stroke-width:10;stroke-miterlimit:4;stroke-dasharray:none"
width="32.915249"
height="1.9515609"
x="15.016818"
y="-106.00282"
transform="rotate(135)" />
<rect
style="fill:#000000;stroke:#000000;stroke-width:10;stroke-miterlimit:4;stroke-dasharray:none"
width="32.915249"
height="1.9515609"
x="-106.00282"
y="-16.968386"
transform="rotate(-135)" />` + svgEnd;
const repeatListSVG = svgStart.replace("0 0 100 100", "10 0 100 110") + `<path
style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:20;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
transform="rotate(-90)"
sodipodi:type="arc"
sodipodi:cx="-47.573391"
sodipodi:cy="66.676941"
sodipodi:rx="37.573391"
sodipodi:ry="37.573414"
sodipodi:start="4.5378561"
sodipodi:end="3.6651914"
sodipodi:arc-type="arc"
d="m -54.097942,29.674352 a 37.573391,37.573414 0 0 1 41.237838,22.623866 37.573391,37.573414 0 0 1 -13.162075,45.157061 37.573391,37.573414 0 0 1 -46.935426,-3.076311 37.573391,37.573414 0 0 1 -7.155298,-46.488733"
sodipodi:open="true" />
<rect
style="fill:#000000;stroke:#000000;stroke-width:10;stroke-miterlimit:4;stroke-dasharray:none"
width="32.915249"
height="1.9515609"
x="-65.493187"
y="-22.577936"
transform="rotate(-135)" />
<rect
style="fill:#000000;stroke:#000000;stroke-width:10;stroke-miterlimit:4;stroke-dasharray:none"
width="32.915249"
height="1.9515609"
x="-22.577936"
y="63.541618"
transform="rotate(-45)" />` + svgEnd;
const syncSVG = svgStart.replace("0 0 100 100", "0 0 110 100") + `<rect
style="fill:#000000;stroke:#000000;stroke-width:9.93948;stroke-miterlimit:4;stroke-dasharray:none"
width="32.716053"
height="1.9397504"
x="-44.910587"
y="54.781082"
transform="matrix(0.71201421,-0.70216505,0.71201421,0.70216505,0,0)" />
<rect
style="fill:#000000;stroke:#000000;stroke-width:9.93948;stroke-miterlimit:4;stroke-dasharray:none"
width="32.716053"
height="1.9397504"
x="54.781082"
y="42.970829"
transform="matrix(0.71201421,0.70216505,-0.71201421,0.70216505,0,0)" />
<rect
style="fill:#000000;stroke:#000000;stroke-width:10.7087;stroke-miterlimit:4;stroke-dasharray:none"
width="63.291317"
height="1.1638763"
x="11.354335"
y="69.019333" />
<rect
style="fill:#000000;stroke:#000000;stroke-width:9.93948;stroke-miterlimit:4;stroke-dasharray:none"
width="32.716053"
height="1.9397504"
x="-50.982647"
y="-93.638168"
transform="matrix(-0.71201421,0.70216505,-0.71201421,-0.70216505,0,0)" />
<rect
style="fill:#000000;stroke:#000000;stroke-width:9.93948;stroke-miterlimit:4;stroke-dasharray:none"
width="32.716053"
height="1.9397504"
x="-93.638168"
y="49.042889"
transform="matrix(-0.71201421,-0.70216505,0.71201421,-0.70216505,0,0)" />
<rect
style="fill:#000000;stroke:#000000;stroke-width:10.7087;stroke-miterlimit:4;stroke-dasharray:none"
width="63.291317"
height="1.1638763"
x="-98.645668"
y="-30.932226"
transform="scale(-1)" />` + svgEnd;
const noSyncSVG = svgStart.replace("0 0 100 100", "0 0 110 100") + `<rect
style="fill:#000000;stroke:#000000;stroke-width:9.93948;stroke-miterlimit:4;stroke-dasharray:none"
width="32.716053"
height="1.9397504"
x="-44.910587"
y="54.781082"
transform="matrix(0.71201421,-0.70216505,0.71201421,0.70216505,0,0)" />
<rect
style="fill:#000000;stroke:#000000;stroke-width:9.93948;stroke-miterlimit:4;stroke-dasharray:none"
width="32.716053"
height="1.9397504"
x="54.781082"
y="42.970829"
transform="matrix(0.71201421,0.70216505,-0.71201421,0.70216505,0,0)" />
<rect
style="fill:#000000;stroke:#000000;stroke-width:10.7087;stroke-miterlimit:4;stroke-dasharray:none"
width="63.291317"
height="1.1638763"
x="11.354335"
y="69.019333" />
<rect
style="fill:#000000;stroke:#000000;stroke-width:9.93948;stroke-miterlimit:4;stroke-dasharray:none"
width="32.716053"
height="1.9397504"
x="-50.982647"
y="-93.638168"
transform="matrix(-0.71201421,0.70216505,-0.71201421,-0.70216505,0,0)" />
<rect
style="fill:#000000;stroke:#000000;stroke-width:9.93948;stroke-miterlimit:4;stroke-dasharray:none"
width="32.716053"
height="1.9397504"
x="-93.638168"
y="49.042889"
transform="matrix(-0.71201421,-0.70216505,0.71201421,-0.70216505,0,0)" />
<rect
style="fill:#000000;stroke:#000000;stroke-width:10.7087;stroke-miterlimit:4;stroke-dasharray:none"
width="63.291317"
height="1.1638763"
x="-98.645668"
y="-30.932226"
transform="scale(-1)" />
<rect
style="fill:#000000;stroke:#000000;stroke-width:10.9459;stroke-miterlimit:4;stroke-dasharray:none"
width="83.054092"
height="0.92666042"
x="-109.25067"
y="18.000542"
transform="rotate(-120)" />` + svgEnd;
const pathfindSVG = svgStart + `<path
style="fill:#000000;fill-rule:nonzero;stroke:none;stroke-width:13.6765;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
d="M 95.138414,68.714019 C 89.811746,66.779793 76.937774,61.926021 64.511934,57.114146 57.325396,54.331177 48.756213,50.962801 41.004921,47.583351 35.509621,45.18748 31.083504,43.072344 27.69944,41.22435 c -1.511624,-0.825478 -2.564896,-1.459954 -3.400568,-1.983676 -0.75034,-0.470245 -1.144413,-0.762278 -1.164562,-0.612315 -0.01958,0.145765 0.373401,0.755801 0.663639,2.145461 0.144892,0.693747 0.237424,1.540882 0.171882,2.495642 -0.06583,0.958995 -0.282877,1.895866 -0.639323,2.762073 -0.350732,0.852317 -0.790958,1.52646 -1.212724,2.026195 -0.415835,0.492709 -0.80337,0.805112 -1.078648,0.980994 -0.630548,0.402874 -0.653713,0.179862 -0.497126,0.01263 0.500157,-0.534147 2.202708,-1.334 4.518135,-2.105185 2.474242,-0.824079 5.482656,-1.582016 8.562766,-2.274897 2.55254,-0.574201 5.27764,-1.130456 7.691201,-1.613545 4.621884,-0.925098 9.289424,-1.744835 13.640719,-2.645224 3.677013,-0.760864 7.177935,-1.586897 10.327988,-2.598292 3.28452,-1.054568 6.467231,-2.397177 9.113653,-4.275787 1.405121,-0.997453 2.770555,-2.224786 3.896751,-3.736257 1.182337,-1.586818 2.087453,-3.475094 2.437951,-5.597542 0.171873,-1.040783 0.199531,-2.077905 0.09146,-3.089723 C 80.70872,20.048393 80.442304,19.028463 80.052187,18.070501 79.315693,16.261985 78.173316,14.75191 76.867246,13.473802 75.559327,12.193886 74.005831,11.067029 72.346719,10.04111 70.591239,8.9556012 68.609432,7.9182835 66.555254,6.9320672 61.07629,4.3016029 54.239842,1.654467 50.246312,0 c 3.645003,2.7467878 8.856744,7.2301701 12.527225,11.797883 1.325107,1.649025 2.379436,3.220047 3.110252,4.654418 0.692031,1.358251 1.048507,2.50904 1.101266,3.371423 0.05225,0.854112 -0.207553,1.318415 -0.544807,1.329341 -0.173642,0.0056 -0.345954,-0.112399 -0.476403,-0.309242 -0.12495,-0.188544 -0.206205,-0.43344 -0.245854,-0.695646 -0.07834,-0.518105 0.03265,-0.996921 0.0095,-1.18386 -0.02219,-0.179502 -0.181689,-0.133291 -0.618563,0.04316 -1.041446,0.420625 -2.309848,0.970044 -4.984606,1.70524 -2.343284,0.644086 -5.174535,1.255876 -8.53877,1.820791 -3.972782,0.667101 -8.34081,1.211755 -13.086587,1.683475 -2.292907,0.22791 -5.4375,0.530233 -8.07634,0.810529 -3.273143,0.347672 -6.952704,0.780269 -10.293188,1.359012 -3.011964,0.521827 -6.504226,1.281836 -9.562163,2.567234 -1.5311583,0.64362 -3.3176602,1.566127 -5.0007467,2.941437 -0.8585666,0.701566 -1.7469212,1.566985 -2.5658429,2.629099 -0.826446,1.071875 -1.5784506,2.340168 -2.14046162,3.810303 -0.56820767,1.486352 -0.89838482,3.065835 -0.97033249,4.692363 -0.0719305,1.626182 0.11955772,3.1683 0.47489394,4.58227 0.70318867,2.798149 2.04464737,5.095381 3.32085117,6.828324 1.3342675,1.811787 2.8996661,3.415312 4.476104,4.817751 1.6681093,1.483992 3.5351006,2.907491 5.5218186,4.274868 4.406187,3.032598 9.78875,6.051374 15.577397,8.968544 8.257168,4.161173 17.378524,8.126674 24.66934,11.121773 13.006767,5.343235 25.851678,9.881047 31.46682,11.920023 z"
sodipodi:nodetypes="cc"
inkscape:path-effect="#path-effect1207"
inkscape:original-d="M 90.267782,82.127264 C -109.79121,9.4816321 148.34729,56.074321 50.246312,0" />` + svgEnd;
const pauseSVG = svgStart + `<rect
style="fill:#000000;stroke:#000000;stroke-width:17.3414;stroke-miterlimit:4;stroke-dasharray:none"
width="2.6586194"
height="72.658623"
x="68.670677"
y="13.670691" />
<rect
style="fill:#000000;stroke:#000000;stroke-width:17.3414;stroke-miterlimit:4;stroke-dasharray:none"
width="2.6586232"
height="72.658623"
x="-31.329311"
y="-86.329308"
transform="scale(-1)" />` + svgEnd;

document.querySelector("#add-action-up")!.innerHTML = upArrowSVG.replace(/"14"/g, '"22"');
document.querySelector("#add-action-down")!.innerHTML = downArrowSVG.replace(/"14"/g, '"22"');
document.querySelector("#add-action-right")!.innerHTML = rightArrowSVG.replace(/"14"/g, '"22"');
document.querySelector("#add-action-left")!.innerHTML = leftArrowSVG.replace(/"14"/g, '"22"');
document.querySelector("#add-action-interact")!.innerHTML = interactSVG.replace(/"14"/g, '"22"');
document.querySelector("#add-action-repeat-interact")!.innerHTML = repeatInteractSVG.replace(/"14"/g, '"22"');
