export const data = {
    board_components : {
        board: {
            category: "board",
            icon: "./res/icons/board.svg",
            table_name: "Boards",
            value: {
                1 : {
                    name: "Classic Birch",
                    brief: "",
                    descripion: "",
                    texture_set: {
                        path: "/board/birch/",
                    },
                    thumbnail: {
                        path: "/board/birch.png",
                    }
                },
                2 : {
                    name: "Spotted Cherry",
                    brief: "",
                    descripion: "",
                    texture_set: {
                        path: "/board/cherry/",
                    },
                    thumbnail: {
                        path: "/board/cherry.png",
                    }
                },
            },
        },
        trucks: {
            category: "trucks",
            icon: "./res/icons/trucks.svg",
            table_name: "Trucks",
            value: {
                1 : {
                    name: "Steel Ruined",
                    brief: "",
                    descripion: "",
                    texture_set: {
                        path: "/trucks/steel_ruined/",
                    },
                    thumbnail: {
                        path: "/trucks/steel_ruined.png",
                    }
                },
                2 : {
                    name: "Galvanized Steel",
                    brief: "",
                    descripion: "",
                    texture_set: {
                        path: "/trucks/steel/",
                    },
                    thumbnail: {
                        path: "/trucks/steel.png",
                    }
                },
                3 : {
                    name: "Polished Chrome",
                    brief: "",
                    descripion: "",
                    texture_set: {
                        path: "/trucks/chrome/",
                    },
                    thumbnail: {
                        path: "/trucks/chrome.png",
                    }
                },
            },
        },
        hardware: {
            category: "hardware",
            icon: "./res/icons/hardware.svg",
            table_name: "Hardware",
            value: {
                1 : {
                    name: "Steel Ruined",
                    brief: "",
                    descripion: "",
                    texture_set: {
                        path: "/hardware/steel_ruined/",
                    },
                    thumbnail: {
                        path: "/hardware/steel_ruined.png",
                    }
                },
                2 : {
                    name: "Standard Steel",
                    brief: "",
                    descripion: "",
                    texture_set: {
                        path: "/hardware/steel/",
                    },
                    thumbnail: {
                        path: "/hardware/steel.png",
                    }
                },
                3 : {
                    name: "Polished Chrome",
                    brief: "",
                    descripion: "",
                    texture_set: {
                        path: "/hardware/chrome/",
                    },
                    thumbnail: {
                        path: "/hardware/chrome.png",
                    }
                },
            },
        },
        wheels: {
            category: "wheels",
            icon: "./res/icons/wheels.svg",
            table_name: "Wheels",
            value: {
                1 : {
                    name: "Glossy Red",
                    brief: "",
                    descripion: "",
                    texture_set: {
                        path: "/wheels/glossy/",
                    },
                    thumbnail: {
                        path: "/wheels/glossy.png",
                    }
                },
                2 : {
                    name: "Matte White",
                    brief: "",
                    descripion: "",
                    texture_set: {
                        path: "/wheels/matte/",
                    },
                    thumbnail: {
                        path: "/wheels/matte.png",
                    }
                },
            },
        },
    },
    base_paths: {
        textures: {
            "2k": "./res/textures/2k",
            "4k": "./res/textures/4k",
        },
        thumbnails: {
            path: "./res/images/thumbnails",
        }
    },
    texture_sets: {
        base_names: {
            albedo: "BaseColor.png",
            metalness: "Metallic.png",
            normal: "Normal.png",
            occlusion: "AmbientOcclusion.png",
            roughness: "Roughness.png",
        }
    },
    model: {
        path: "./res/models/skateboard/",
        name: "skateboard.gltf",
    },
    model_renames: {
        board : "Board_high",
        trucks : "Trucks_high",
        wheels : "Wheels_high",
        hardware: "Hardware_high",
    },
    uniform_renames: {

    },
};