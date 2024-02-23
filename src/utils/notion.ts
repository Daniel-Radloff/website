import { Client } from '@notionhq/client';
import { GetPageResponse } from '@notionhq/client/build/src/api-endpoints';
import { NotionToMarkdown } from 'notion-to-md';

// Exports Some functions to get Documents that we can display posts from notion.
// Contains all the notion logic


//Helpers
const notion = new Client({
    auth: process.env.NOTION_TOKEN,
})

const getTags = (tags: any) => {
    const allTags = tags.map((tag: any, index: number) => {
        return { name: tag.name, color: tag.color };
    });

    return allTags;
};

const n2m = new NotionToMarkdown({ notionClient: notion });

const getPageMetaData = (post: any) => {
    const formatDate = (datestring: string) => {
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        let date = new Date(datestring);

        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        let today = `${month} ${day}, ${year}`;

        return today;
    };

    return {
        id: post.id,
        title: post.properties.Name.title[0].plain_text,
        tags: getTags(post.properties.Tags.multi_select),
        description: post.properties.Description.rich_text[0].plain_text,
        date: formatDate(post.properties.Date.date.start),
        last_edited: formatDate(post.properties.Date.last_edited_time),
        image: "",
        author: post.properties.Author.rich_text[0].plain_text,
    };
};

// This section has everything to do with getting information about projects
export const getProjects = async () => {
    const projects = await notion.databases.query({
        database_id: process.env.PROJECTS_ID as string,
        sorts: [
            {
                property: 'Name',
                direction: 'ascending'
            }
        ]
    });

    return projects.results.map((project: any) => {
        return {
            name: project.properties.Name.title[0].plain_text,
            description: project.properties.Description.rich_text[0].plain_text,
            link: project.properties.URL.url,
            stack: project.properties.Stack.multi_select.map((item: any) => item.name),
            id: project.id
        }
    });
}

export const getProject = async (id: string) => {
    const project = await notion.pages.retrieve({
        page_id : id
    });
    const mdblocks = await n2m.pageToMarkdown(project.id);
    const mdString = n2m.toMarkdownString(mdblocks);



    return {
        name: project.properties.Name.title[0].plain_text,
        description: project.properties.Description.rich_text[0].plain_text,
        link: project.properties.URL.url,
        stack: getTags(project.properties.Stack.multi_select),
        id: project.id,
        content: mdString.parent ? mdString.parent : '',
    }
}

// This section has everything to do with getting blog posts.
export const getPosts = async () => {
    const posts = await notion.databases.query({
        database_id: process.env.BLOG_DB_ID as string,
        filter: {
            property: "Published",
            checkbox: {
                equals: true,
            },
        },
        sorts: [
            {
                property: "Date",
                direction: "descending",
            },
        ],
    });

    return posts.results.map((post: any) => {
        return getPageMetaData(post);
    });
}

export const getPostsByTag = async (tag: string) => {
    const posts = await notion.databases.query({
        database_id: process.env.BLOG_DB_ID as string,
        filter: {
            property: "Tags",
            multi_select: {
                contains: tag
            }
        },
        sorts: [
            {
                property: "Date",
                direction: "descending",
            },
        ],
    })

    return posts.results.map((post: any) => {
        return getPageMetaData(post);
    });
}

export const getPostsByAuthor = async (author: string) => {

    const response = await notion.databases.query({
        database_id: process.env.BLOG_DB_ID as string,
        filter: {
            property: "Author",
            formula: {
                string: {
                    equals: author,
                },
            },
        },
        sorts: [
            {
                property: "Date",
                direction: "descending",
            },
        ],
    });

    return response.results.map((post: any) => {
        return getPageMetaData(post);
    })

}

export const getPost = async (id: string) => {

    const page = await notion.pages.retrieve({
        page_id : id
    });

    const metadata = getPageMetaData(page);
    const mdblocks = await n2m.pageToMarkdown(page.id);
    const mdString = n2m.toMarkdownString(mdblocks);

    return {
        metadata: metadata,
        markdown: mdString.parent ? mdString.parent : mdString,
    }
}
