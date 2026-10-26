import { useState, useEffect, useRef } from "react"

// Optional: If you're loading secure web maps
// import { configureOAuth } from "./auth/configureOAuth";
// configureOAuth({
//   // Default portalUrl is ArcGIS Online
//   // Only set if using other portals
//   portalUrl: "YOUR_PORTAL_URL",
//   appId: "YOUR_APP_ID",
// });

// Individual imports for each Map, Chart and Calcite component
import "@arcgis/map-components/components/arcgis-expand"
import "@arcgis/map-components/components/arcgis-legend"
import "@arcgis/map-components/components/arcgis-map"
import "@arcgis/map-components/components/arcgis-search"
import "@arcgis/map-components/components/arcgis-zoom"
import "@arcgis/charts-components/components/arcgis-chart"
import "@esri/calcite-components/components/calcite-shell"
import "@esri/calcite-components/components/calcite-navigation"
import "@esri/calcite-components/components/calcite-navigation-logo"

// Import modules and types from the SDK's core API
import CustomContent from "@arcgis/core/popup/content/CustomContent.js"
import Graphic from "@arcgis/core/Graphic.js"
import Point from "@arcgis/core/geometry/Point.js"
import PopupTemplate from "@arcgis/core/PopupTemplate.js"
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol.js"
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol.js"

// Custom imports
import umbcLogo from "./assets/umbc_shield.png"
import { CustomParametersMixin } from "@arcgis/core/layers/mixins/CustomParametersMixin"

export function App() {
  const [navHeading, setNavHeading] = useState("")
  const [navDescription, setNavDescription] = useState("")
  const mapRef = useRef(null)

  const handleViewReady = async (event) => {
    const viewElement = event.target

    // Use metadata from the Web Map to populate the header
    const map = viewElement.map
    const portalItem = map.portalItem
    const title = portalItem?.title ? portalItem.title : "A web map"
    const description = portalItem?.description
      ? portalItem.description
      : "CMSC 447 Section 5 Team 2"

    setNavHeading(title)
    setNavDescription(description)

    await map.loadAll()

    const bmpLayer = map.allLayers.find((layer) => layer.title === "BMP Database")

    if (bmpLayer) {

      bmpLayer.popupTemplate = new PopupTemplate({
        title: bmpLayer.popupTemplate?.title || "{BMP ID}",
        content: bmpLayer.popupTemplate?.content || "{*}"
      })

      // Create Popup Buttons
      const workOrderButtonContent = new CustomContent({
        creator: (event) => {
          const graphic = event.graphic || event
          const attributes = graphic.attributes || {}

          const button = document.createElement("calcite-button")
          button.textContent = "Create Work Order"
          button.width = "full"
          button.scale = "m"
          button.appearance = "solid"
          button.style.marginTop = "12px"

          button.addEventListener("click", () => {
            alert("TODO: Redirect to work order template")
          })

          return button
        },
      })

      const inspectionReportButtonContent = new CustomContent({
        creator: (event) => {
          const graphic = event.graphic || event
          const attributes = graphic.attributes || {}

          const button = document.createElement("calcite-button")
          button.textContent = "Conduct Inspection Report"
          button.width = "full"
          button.scale = "l"
          button.appearance = "solid"
          button.style.marginTop = "12px"

          button.addEventListener("click", () => {
            alert("TODO: Redirect to inspection report template")
          })

          return button
        },
      })

      if (Array.isArray(bmpLayer.popupTemplate.content)) {
        bmpLayer.popupTemplate.content.push(inspectionReportButtonContent)
        bmpLayer.popupTemplate.content.push(workOrderButtonContent)
      } else {
        bmpLayer.popupTemplate.content = [
          { type: "fields" },
          inspectionReportButtonContent,
          workOrderButtonContent
        ]
      }
    } else {
      console.warn("BMP Database layer not found...")
    }
  }

  return (
    // The Shell component is used as a layout for this template
    <calcite-shell content-behind>
      <calcite-navigation slot="header">
        {/* Heading and description dynamically populated */}
        <calcite-navigation-logo
          heading={navHeading}
          description={navDescription}
          heading-level="1"
          slot="logo"
          thumbnail={umbcLogo}
        ></calcite-navigation-logo>
      </calcite-navigation>
      {/* The Map component fits to the size of the parent element  */}
      {/* The basemap, extent, zoom and more are provided by the Web Map (item-id) */}
      {/* Note: popup-component-enabled enables the Popup component (beta). See https://developers.arcgis.com/javascript/latest/references/map-components/components/arcgis-map/#popupComponentEnabled for details. */}
      <arcgis-map
        item-id="764b68e81e2449fd87136908af258c24"
        popup-component-enabled
        onarcgisViewReadyChange={handleViewReady}
      >
        <arcgis-zoom slot="bottom-right" />
        <arcgis-search slot="top-left" />
        <arcgis-expand slot="top-right">
          <arcgis-legend></arcgis-legend>
        </arcgis-expand>
        {/*  A Feature Layer in the Web Map has an associated chart (layer-item-id) */}
      </arcgis-map>
    </calcite-shell>
  )
}
