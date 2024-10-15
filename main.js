const $ = (el, item=document) => item.querySelector(el);
const $$ = (el, item=document) => item.querySelectorAll(el);

$$(".tab").forEach(tab => {
    tab.onclick = () => {
        $$(`.tab[data-tab-group='${tab.getAttribute('data-tab-group')}']`).forEach(neighbourTab => neighbourTab.classList.remove("active"));
        $$(`.tab-content[data-tab-group='${tab.getAttribute('data-tab-group')}']`).forEach(neighbourTab => neighbourTab.classList.remove("active"));
        tab.classList.add("active");
        const tabContent = $(`.tab-content[data-tab-group='${tab.getAttribute('data-tab-group')}'][data-tab='${tab.getAttribute('data-tab')}']`);
        if (tabContent) {
            tabContent.classList.add('active');
        }
    }
});

class Tag {
    constructor(tagSpace, name, x, y, tagId = null) {
        this.tagSpace = tagSpace;

        this.name = name;
        this.x = x;
        this.y = y;

        this.vx = 0;
        this.vy = 0;

        this.parents = [];
        this.children = [];

        if (tagId == null) {
            this.tagId = Math.random().toString(16).slice(2);
        } else {
            this.tagId = tagId;
        }

        this.element = document.createElement('div');
        this.element.id = this.tagId;

        this.linksToParentsElements = {};

        this.holding = false;

        this.display();
    }

    display() {
        this.element.classList.add("tag");
        this.element.innerText = this.name;
        this.element.contentEditable = false;

        this.element.addEventListener('mousedown', e => {
            e.stopPropagation();
            if (this.element.contentEditable == "false") {
                holdingTag = this;
            }
        });

        this.element.addEventListener('click', e => {
            e.stopPropagation();

            $$('.tag').forEach(tag => {
                if (tag.id != this.element.id) {
                    tag.contentEditable = false
                }
            });

            if (mode == "link") {
                if (this.element.classList.contains('active')) {
                    newLink.fromTag = null;
                    this.element.classList.remove('active');
                } else if (newLink.fromTag) {
                    if (this.linksToParentsElements[newLink.fromTag.tagId] != null) {
                        this.removeParentById(newLink.fromTag.tagId);
                        newLink.fromTag.removeChildById(this.tagId);
                    } else if (newLink.fromTag.linksToParentsElements[this.tagId] != null) {
                        newLink.fromTag.removeParentById(this.tagId);
                        this.removeChildById(newLink.fromTag.tagId);
                    } else {
                        this.addChild(newLink.fromTag);
                        newLink.fromTag.addParent(this);
                        newLink.fromTag.displayLinkToParent(this);
                    }
                }
            }
        });

        this.element.addEventListener('contextmenu', e => {
            e.preventDefault();
            e.stopPropagation();


            $$('.tag').forEach(tag => tag.classList.remove('selected'));
            this.element.classList.add('selected');
            this.element.focus();


            selectedTag = this;
        });

        this.element.addEventListener('dblclick', e => {
            e.stopPropagation();
            this.element.classList.remove('selected');
            selectedTag = null;
            
            if (mode == "tag") {
                this.element.contentEditable = true;
                this.element.focus();
            } else if(mode == "link") {
                if (!newLink.fromTag) {
                    newLink.fromTag = this;
                    this.element.classList.add('active');
                } else {
                    this.addChild(newLink.fromTag);
                    newLink.fromTag.addParent(this);
                    newLink.fromTag.displayLinkToParent(this);
                }
            }
            
        });

        this.element.addEventListener('keydown', e => {
            if (e.key == "Enter") {
                e.preventDefault();
                this.element.contentEditable = false;
            }
            if (e.key == "Space") {
                e.stopPropagation();
            }
        });

        this.element.addEventListener('input', e => {
            this.name = this.element.innerText;
        });

        this.tagSpace.appendChild(this.element);
    }

    displayLinkToParent(parent) {
        let element = document.createElement('div');
        element.id = `${this.tagId}_${parent.tagId}`;
        element.classList.add('tags-link');

        let arrow = document.createElement('div');
        arrow.classList.add('tags-link-triangle');
        element.appendChild(arrow);

        this.tagSpace.appendChild(element);
        this.linksToParentsElements[parent.tagId] = element;
    }

    addParent(parent) {
        this.parents.push(parent);
    }

    addChild(child) {
        this.children.push(child);
    }

    removeChildById(tagId) {
        this.children = this.children.filter(child => child.tagId != tagId);
    }

    removeParentById(tagId) {
        this.parents = this.parents.filter(parent => parent.tagId != tagId);
        this.linksToParentsElements[tagId].remove();
        delete this.linksToParentsElements[tagId];
    }

    remove() {
        this.element.remove();
        for (let key in this.linksToParentsElements) {
            this.linksToParentsElements[key].remove();
        }
        this.parents.forEach(parent => {
            parent.removeChildById(this.tagId);
        })

        this.children.forEach(child => {
            child.removeParentById(this.tagId);
        })

        
    }

    update() {
        if (!simulation) {
            this.vx = 0;
            this.vy = 0;
        }
        this.x += this.vx;
        this.y += this.vy;

        this.vx *= (1 - cam.frictionCoefficient);
        this.vy *= (1 - cam.frictionCoefficient);

        let w = this.tagSpace.offsetWidth;
        let h = this.tagSpace.offsetHeight;

        let x = (this.x - cam.x) * (h / 2) * cam.zoom + w / 2;
        let y = (this.y - cam.y) * (h / 2) * cam.zoom + h / 2;

        let halfW = this.element.offsetWidth / 2;
        let halfH = this.element.offsetHeight / 2;

        this.element.style.left = `${x - halfW}px`;
        this.element.style.top = `${y - halfH}px`;
        this.element.style.transform = `scale(${cam.zoom})`;

        this.parents.forEach(
            parent => {
                let element = this.linksToParentsElements[parent.tagId];
                let oldX = (this.x + parent.x) / 2;
                let oldY = (this.y + parent.y) / 2;
                let length = Math.sqrt((this.x - parent.x) ** 2 + (this.y - parent.y) ** 2);
                let tangent = (this.y - parent.y) / (this.x > parent.x ? Math.max(0.00001, (this.x - parent.x)) : Math.min(-0.00001, (this.x - parent.x)));
                
                let angle = Math.atan(tangent) * 180 / Math.PI;

                if (this.x < parent.x) {
                    angle = angle + 180;
                }

                element.style.width = `${length * h / 2}px`;

                let x = (oldX - cam.x) * (h / 2) * cam.zoom + w / 2;
                let y = (oldY - cam.y) * (h / 2) * cam.zoom + h / 2;

                let halfW = element.offsetWidth / 2;
                let halfH = element.offsetHeight / 2;

                element.style.left = `${x - halfW}px`;
                element.style.top = `${y - halfH}px`;
                element.style.transform = `scale(${cam.zoom}) rotate(${angle}deg)`;
            }
        );

        tags.forEach(tag => {
            if (tag.tagId != this.tagId) {
                let dX = (tag.x - this.x);
                let dY = (tag.y - this.y);
                let d = Math.sqrt(dX*dX + dY*dY);
                dX /= d;
                dY /= d;

                let coeff = cam.repulsionCoefficient;
                let aX = -dX * (coeff / (d * d));
                let aY = -dY * (coeff / (d * d));

                this.vx += aX;
                this.vy += aY;
            }
        });

        this.parents.forEach(tag => {
            let dX = (tag.x - this.x);
            let dY = (tag.y - this.y);
            let d = Math.sqrt(dX*dX + dY*dY);
            dX /= d;
            dY /= d;

            let idealLength = cam.idealLength;
            let coeff = cam.elasticyCoefficient;
            let aX = -dX * (idealLength - d) * coeff;
            let aY = -dY * (idealLength - d) * coeff;

            this.vx += aX;
            this.vy += aY;
            tag.vx -= aX;
            tag.vy -= aY;
        })
    }
}

const clickToCoords = (tagsSpace, e) => {
    let w = tagsSpace.offsetWidth;
    let h = tagsSpace.offsetHeight;

    let x = (e.pageX - tagsSpace.offsetLeft - w / 2) / (h * cam.zoom / 2) + cam.x;
    let y = (e.pageY - tagsSpace.offsetTop - h / 2) / (h * cam.zoom / 2) + cam.y;

    return {x, y};
}

let tagsSpace = $("#tags-space");
let tags = [];
let zoom = 1;
let cam = {
    x: 0, 
    y: 0, 
    zoom: 1, 
    hold: false, 
    holdStart: {x: 0, y: 0}, 
    repulsionCoefficient: 0.00001,
    frictionCoefficient: 0.1,
    elasticyCoefficient: 0.01,
    idealLength: 0.15
};

let selectedTag = null;
let holdingTag = null;
let newLink = {fromTag: null, toTag: null};
let mode = "tag";
let simulation = false;

const tagsToolBtn = $('#tags-tool');
const linksToolBtn = $('#links-tool');

tagsToolBtn.addEventListener('click', () => {
    mode = "tag";
    newLink = {fromTag: null, toTag: null};
    tags.forEach(tag => tag.element.classList.remove('active'));
})

linksToolBtn.addEventListener('click', () => {
    mode = "link";
    newLink = {fromTag: null, toTag: null};
})

tagsSpace.addEventListener('click', e => {
    $$('.tag').forEach(tag => tag.contentEditable = false);
    $$('.tag').forEach(tag => tag.classList.remove('selected'));
    selectedTag = null;
});


tagsSpace.addEventListener('mousedown', e => {
    cam.hold = true;
    let {x, y} = clickToCoords(tagsSpace, e);
    cam.holdStart.x = x;
    cam.holdStart.y = y;
});

tagsSpace.addEventListener('mousemove', e => {
    let {x, y} = clickToCoords(tagsSpace, e);

    if (holdingTag) {
        holdingTag.x = x;
        holdingTag.y = y;
    }

    if (cam.hold) {
        cam.x -= x - cam.holdStart.x;
        cam.y -= y - cam.holdStart.y;

        let newCoords = clickToCoords(tagsSpace, e);
        cam.holdStart.x = newCoords.x;
        cam.holdStart.y = newCoords.y;
    }
});

tagsSpace.addEventListener('mouseup', e => {
    holdingTag = null;
    cam.hold = false;
});

tagsSpace.addEventListener('wheel', e => {
    cam.zoom *= Math.pow(1.1, -e.deltaY / 100);
});

tagsSpace.addEventListener('dblclick', e => {
    let {x, y} = clickToCoords(tagsSpace, e);
    let tag = new Tag(tagsSpace, "", x, y);
    tags.push(
        tag
    );

    tag.element.contentEditable = true;
    tag.element.focus();
});

window.addEventListener('keydown', e => {
    if (selectedTag && e.code == "Delete") {
        tags = tags.filter(tag => tag.tagId != selectedTag.tagId);
        selectedTag.remove();
    }

    if (e.code == "Space") {
        simulation = !simulation;
    }

    if (e.code == "Escape") {
        tags = [];
        // Array.from(tagsSpace.children).forEach(child => child.remove());
    }
});

let data = localStorage.getItem('data');

const putData = (data) => {
    data = JSON.parse(data);
    cam = data.cam;
    tags.forEach(tag => tag.remove());
    tags = [];
    idsToTags = {};

    data.tags.forEach(tag => {
        let newTag = new Tag(tagsSpace, tag.name, tag.x, tag.y, tag.tagId);
        tags.push(
            newTag
        );
        idsToTags[tag.tagId] = newTag;
    });

    tags.forEach((tag, i) => {
        let parents = data.tags[i].parents;
        parents.forEach(parentTagId => {
            tag.addParent(idsToTags[parentTagId]);
            idsToTags[parentTagId].addChild(tag);
            tag.displayLinkToParent(idsToTags[parentTagId]);
        });
    });

    elasticyCoefficientInput.value = cam.elasticyCoefficient;
    repulsionCoefficientInput.value = cam.repulsionCoefficient;
    idealLengthInput.value = cam.idealLength;
    frictionCoefficientInput.value = cam.frictionCoefficient;
}

if (data) {
    // putData(data);
}

const dataSaving = $('#data-saving');
const getJsonBtn = $('#get-json');
const putJsonBtn = $('#put-json');

const idealLengthInput = $("#ideal-length");
const elasticyCoefficientInput = $("#elasticy-coefficient");
const repulsionCoefficientInput = $("#repulsion-coefficient");
const frictionCoefficientInput = $("#friction-coefficient");
const startSimulationButton = $("#start-simulation");
const applySettingsButton = $("#apply-settings");

getJsonBtn.onclick = () => {
    let data = localStorage.getItem('data');
    dataSaving.value = data;
}

putJsonBtn.onclick = () => {
    let data = dataSaving.value;
    putData(data);
}

applySettingsButton.onclick = () => {
    cam.elasticyCoefficient = elasticyCoefficientInput.value;
    cam.repulsionCoefficient = repulsionCoefficientInput.value;
    cam.idealLength = idealLengthInput.value;
    cam.frictionCoefficient = frictionCoefficientInput.value;
}

const loop = () => {

    let data = {
        tags: [],
        cam: cam
    };
    tags.forEach(tag => {
        tag.update();
        data.tags.push({
            x: tag.x,
            y: tag.y,
            name: tag.name,
            tagId: tag.tagId,
            parents: tag.parents.map(parent => parent.tagId)
        });
    });
    localStorage.setItem('data', JSON.stringify(data));

    requestAnimationFrame(loop);
}

loop()