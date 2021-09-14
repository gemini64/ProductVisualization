export function overlay( data ) {
    const markup = `
        <div id="overlay" visible="true">
            ${data.buttons}
            <div id=products-panel>
                ${data.products}
            </div>
        </div>
    `;

    return markup;
}

export function button_list( data ) {
    const markup = `
        <div class="button_list" id="${data.id}">
            ${data.content}
        </div>
    `;
    return markup;
}

export function button( data ) {
    const markup = `
        <div class="button" button-category="${data.category}" selected="false">
            <div>
                <img src="${data.image_path}" alt="${data.alt}"/>
            </div>
        </div>
    `;

    return markup;
}

export function product_list( data ) {
    const markup = `
        <div class="product-list" visible="false" product-category="${data.category}">
            ${data.content}
        </div>
    `;
    return markup;
}

export function close_button( data ) {
    const markup = `
        <div class="close-button" category="${data.category}">
            <div>
                <img src="${data.image_path}" alt="${data.alt}">
            </div>
        </div>
    `;
    return markup;
}

export function product( data ) {
    const markup = `
        <div class="product" category="${data.category}" selected="${data.selected}" texture-path="${data.texture_path}">
            <div class="prod-img">
                <img src="${data.image_path}" alt="${data.alt}">
            </div>
            <p class="description">${data.text}</p>
        </div>
    `;

    return markup;
}