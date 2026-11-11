import { useState, useRef } from "react"

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
import "@esri/calcite-components/components/calcite-action"

// Import modules and types from the SDK's core API
import CustomContent from "@arcgis/core/popup/content/CustomContent.js"
import Graphic from "@arcgis/core/Graphic.js"
import Point from "@arcgis/core/geometry/Point.js"
import PopupTemplate from "@arcgis/core/PopupTemplate.js"
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol.js"
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol.js"

// Inspection Report Component
import { InspectionReport } from "./inspection/InspectionReport"

export function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw =
        localStorage.getItem("cmsc447_user") ||
        localStorage.getItem("umbc_hydro_gis_session")
      return raw ? JSON.parse(raw) : { username: "Inspector" }
    } catch (e) {
      return { username: "Inspector" }
    }
  })

  const [navHeading, setNavHeading] = useState("")
  const [navDescription, setNavDescription] = useState("")
  const mapRef = useRef(null)

  // Route/view handling: check if opened with ?view=inspection
  const [viewMode, setViewMode] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get("view") || "map"
  })

  // If inspection view requested (e.g. redirected or new tab), render InspectionReport
  if (viewMode === "inspection") {
    return (
      <InspectionReport
        currentUser={currentUser}
        onBackToMap={() => {
          const url = new URL(window.location.href)
          url.searchParams.delete("view")
          url.searchParams.delete("bmpId")
          window.history.pushState({}, "", url.pathname)
          setViewMode("map")
        }}
      />
    )
  }

  const handleLogout = () => {
    try {
      localStorage.removeItem("cmsc447_user")
      localStorage.removeItem("umbc_hydro_gis_session")
    } catch (e) {}
    setCurrentUser(null)
  }

  const handleViewReady = async (event) => {
    const viewElement = event.target

    // Use metadata from the Web Map to populate the header
    const map = viewElement.map
    const portalItem = map.portalItem
    const title = portalItem?.title ? portalItem.title : "Stormwater GIS"
    const description = portalItem?.description
      ? portalItem.description
      : "CMSC 447 Section 5 Team 2"

    setNavHeading(title)
    setNavDescription(description)

    await map.loadAll()

    const bmpLayer = map.allLayers.find((layer) => layer.title === "BMP Database")
    const bmpLayerIcons = map.allLayers.find(
      (layer) => layer.title === "BMP Database - Icons"
    )

    // Create Popup Button: Conduct Inspection Report
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
        button.style.setProperty("--calcite-font-weight-normal", "bold")

        button.addEventListener("click", () => {
          // 1. Store the selected BMP's attributes in sessionStorage for the new tab
          sessionStorage.setItem("active_inspection_bmp", JSON.stringify(attributes))

          // 2. Open inspection form in a new tab as requested
          const bmpId = attributes.BMP_ID || attributes.Facility_N || "BMP"
          const targetUrl = `${window.location.origin}${window.location.pathname}?view=inspection&bmpId=${encodeURIComponent(bmpId)}`
          window.open(targetUrl, "_blank")
        })

        return button
      },
    })

    const setupLayerPopup = (layer) => {
      if (!layer) return

      layer.popupTemplate = new PopupTemplate({
        title: layer.popupTemplate?.title || "{BMP ID}",
        content: layer.popupTemplate?.content || "{*}",
      })

      if (Array.isArray(layer.popupTemplate.content)) {
        layer.popupTemplate.content.push(inspectionReportButtonContent)
      } else {
        layer.popupTemplate.content = [
          { type: "fields" },
          inspectionReportButtonContent,
        ]
      }
    }

    if (bmpLayer) setupLayerPopup(bmpLayer)
    if (bmpLayerIcons) setupLayerPopup(bmpLayerIcons)

    if (!bmpLayer && !bmpLayerIcons) {
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
        ></calcite-navigation-logo>

        <calcite-action
          slot="content-end"
          icon="user"
          text={currentUser?.username ? `User: ${currentUser.username}` : "Account"}
          text-enabled
        ></calcite-action>

        <calcite-action
          slot="content-end"
          icon="sign-out"
          text="Log Out"
          text-enabled
          onClick={handleLogout}
        ></calcite-action>
      </calcite-navigation>

      {/* The Map component fits to the size of the parent element  */}
      {/* The basemap, extent, zoom and more are provided by the Web Map (item-id) */}
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
      </arcgis-map>
    </calcite-shell>
  )
}
