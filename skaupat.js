// ==UserScript==
// @name         S-kaupat
// @namespace    http://tampermonkey.net/
// @version      0.8
// @description  Nutrition (protein) & pirce comparison for S-kaupat
// @author       You
// @match        https://www.s-kaupat.fi/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    var id = "mnxNhf1pf2lj-GrayD_id"
    var itemList = window.itemList = null
    var itemListCount = window.itemListCount = null
    var selector = '[role="list"] > [data-test-id="product-list-item"] > article'
    var itemLinks = window.itemLinks = []
    var lastAppendenItem = window.lastAppendenItem = 0
    var currentURL = window.location.href;

    setInterval(function () {
        if (currentURL !== window.location.href) {
            console.log("Changed")
            window.itemList = itemList = null;
            window.itemListCount = itemListCount = null;
            window.itemLinks = itemLinks = []
            window.lastAppendenItem = lastAppendenItem = 0
            setItems()
            currentURL = window.location.href;
        }
    }, 2500);

    function createNutrientStatus(nutrient) {
        var nutrientStatus = document.createElement("div");
        nutrientStatus.className = nutrient + "-status";
        nutrientStatus.style = "color: black; font-size: 12px;";
        nutrientStatus.innerHTML = nutrient;
        return nutrientStatus;
    }
    function createCircle(proteinAmount, fatAmount) {
        var ratio = proteinAmount / fatAmount;
        var hue = 0;
        if (ratio < 2) {
            hue = ratio * 45;
        } else if (ratio >= 2 && ratio < 5) {
            hue = ratio * 45;
        } else if (ratio >= 5) {
            hue = 225;
        } else if (ratio == Infinity) {
            hue = 225;
        }
        var circle = document.createElement("div");
        circle.className = "circle";
        circle.style.cssText = "width: 20px; height: 20px; border-radius: 50%; background-color: hsl(" + hue + ", 100%, 50%);";
        return circle;
    }

    function createCirclePrice(price, proteinAmount) {
        var parcedPrice = parseFloat(price.replace(/,/g, "."))
        var proteinPerKg = proteinAmount * 10
        var ratio = parcedPrice / proteinPerKg;
        var hue = 0;
        if (ratio >= 0 && ratio < 0.05) {
            hue = 240 - (240 / (0.05 - 0.027)) * (ratio - 0.027)
        } else {
            hue = 0
        }
        var circle = document.createElement("div");
        circle.className = "circle";
        circle.style.cssText = "width: 20px; height: 20px; border-radius: 50%; background-color: hsl(" + hue + ", 100%, 50%);";
        return circle;
    }

    function setItems() {
        window.itemList = itemList = document.querySelectorAll(selector)
        window.itemListCount = itemListCount = document.querySelectorAll(selector).length
        window.itemLinks = itemLinks = itemList.forEach(function (item) {
            var itemLink = item.querySelector("article > div > a").href
            var itemCode = itemLink.match(/\/tuote\/(.*)/)[1]
            window.itemLinks = itemLinks.push(itemCode)
        })
    }
    async function appendData(element) {
        var targetElement = element.querySelector('div[data-test-id="product-card__productPrice"]')
        targetElement.style.flexDirection = "row";
        var itemLink = element.querySelector("article > div > a").href
        var itemCode = itemLink.match(/\/tuote\/(.*)/)[1]
        fetch("https://www.s-kaupat.fi/_next/data/" + id + "/tuote/" + itemCode + ".json")
            .then(function (response) {
                return response.json();
            }).then(function (data) {
                try {
                    var proteinAmount = (data.pageProps.product.nutrients).filter(nutrient => nutrient.name === "Proteiinia")[0].value
                    var fatAmount = (data.pageProps.product.nutrients).filter(nutrient => nutrient.name === "Rasvaa")[0].value
                    proteinAmount = parseFloat(proteinAmount.replace(/,/g, ".").split(" ")[0])
                    fatAmount = parseFloat(fatAmount.replace(/,/g, ".").split(" ")[0])
                    var combined = document.createElement("div")
                    combined.appendChild(createCircle(proteinAmount, fatAmount));
                    combined.appendChild(createNutrientStatus(proteinAmount))
                    combined.appendChild(createNutrientStatus(fatAmount))
                    targetElement.appendChild(combined)
                    try {
                        var targetElementValue = element.querySelector('div[data-test-id="product-card__productPrice__comparisonPrice"]').innerText.split(" ")[0]
                        targetElement.appendChild(createCirclePrice(targetElementValue, proteinAmount))
                    }
                    catch (e) {
                        console.log(e)
                    }
                }
                catch (e) {
                    console.log("Nutrient value for element - " + itemCode + " was not found")
                }
            })
    }

    var addValues = setInterval(async function () {
        if (itemList !== null) {
            if (itemList.length > lastAppendenItem + 1) {
                for (var i = lastAppendenItem; i < itemList.length; i++) {
                    window.lastAppendenItem = lastAppendenItem = i
                    await appendData(itemList[i])
                }
            }
        }
    }, 500)

    var checkItemList = setInterval(function findItemList() {
        if (itemListCount == null || itemList == null) {
            if (document.querySelectorAll(selector).length > 0) {
                setItems()
            }
        }
    }, 500)


    window.addEventListener("scroll", function () {
        if (document.querySelectorAll(selector).length !== itemListCount) {
            itemLinks = []
            setItems()
        }
    })

})();